import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase/auth-verify";
import { createConnectAccount, createAccountLink } from "@/lib/stripe";
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

    const { orgId } = await request.json();

    if (!orgId || verifiedUser.uid !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if org already has a Stripe account
    const orgDoc = await getDoc(doc(db, "orgs", orgId));
    if (!orgDoc.exists()) {
      return NextResponse.json({ error: "Org not found" }, { status: 404 });
    }

    const orgData = orgDoc.data();
    let stripeAccountId = orgData.stripeAccountId;

    // Create a new Connect account if none exists
    if (!stripeAccountId) {
      stripeAccountId = await createConnectAccount(verifiedUser.email);
      await updateDoc(doc(db, "orgs", orgId), {
        stripeAccountId,
        stripeOnboardingComplete: false,
        updatedAt: serverTimestamp(),
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const onboardingUrl = await createAccountLink(
      stripeAccountId,
      `${appUrl}/api/stripe/connect/callback?orgId=${orgId}&refresh=true`,
      `${appUrl}/api/stripe/connect/callback?orgId=${orgId}`
    );

    return NextResponse.json({ url: onboardingUrl });
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return NextResponse.json(
      { error: "Failed to set up payments" },
      { status: 500 }
    );
  }
}
