import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase/auth-verify";
import { createCheckoutSession } from "@/lib/stripe";
import { doc, getDoc } from "firebase/firestore";
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

    const { orgId } = await request.json();

    if (!orgId) {
      return NextResponse.json(
        { error: "orgId is required" },
        { status: 400 }
      );
    }

    // Get the org and its Stripe details
    const orgDoc = await getDoc(doc(db, "orgs", orgId));
    if (!orgDoc.exists()) {
      return NextResponse.json({ error: "Org not found" }, { status: 404 });
    }

    const orgData = orgDoc.data();
    if (
      !orgData.stripeAccountId ||
      !orgData.stripeOnboardingComplete ||
      !orgData.stripePriceId
    ) {
      return NextResponse.json(
        { error: "Creator has not set up billing" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const checkoutUrl = await createCheckoutSession(
      orgData.stripePriceId,
      orgData.stripeAccountId,
      `${appUrl}/chat?subscribed=${orgId}`,
      `${appUrl}/select-creator?canceled=true`,
      {
        userId: verifiedUser.uid,
        orgId,
      }
    );

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}
