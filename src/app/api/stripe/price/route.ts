import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase/auth-verify";
import { createSubscriptionPrice } from "@/lib/stripe";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    const verifiedUser = await verifyFirebaseToken(idToken ?? "");
    if (!verifiedUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, amountInCents } = await request.json();

    if (!orgId || verifiedUser.uid !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!amountInCents || amountInCents < 100) {
      return NextResponse.json(
        { error: "Price must be at least $1.00" },
        { status: 400 }
      );
    }

    // Get the org's Stripe Connected Account
    const orgDoc = await getDoc(doc(db, "orgs", orgId));
    if (!orgDoc.exists()) {
      return NextResponse.json({ error: "Org not found" }, { status: 404 });
    }

    const orgData = orgDoc.data();
    if (!orgData.stripeAccountId || !orgData.stripeOnboardingComplete) {
      return NextResponse.json(
        { error: "Complete Stripe onboarding first" },
        { status: 400 }
      );
    }

    const { priceId } = await createSubscriptionPrice(
      orgData.stripeAccountId,
      amountInCents,
      `${orgData.name} - Monthly Subscription`
    );

    await updateDoc(doc(db, "orgs", orgId), {
      stripePriceId: priceId,
      subscriptionPriceInCents: amountInCents,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ priceId, amountInCents });
  } catch (error) {
    console.error("Stripe price error:", error);
    return NextResponse.json(
      { error: "Failed to set price" },
      { status: 500 }
    );
  }
}
