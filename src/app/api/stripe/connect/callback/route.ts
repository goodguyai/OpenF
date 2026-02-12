import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { stripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  const isRefresh = searchParams.get("refresh") === "true";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!orgId) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=missing_org_id`
    );
  }

  // If this is a refresh (user didn't complete onboarding), redirect back
  if (isRefresh) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?stripe_refresh=true`
    );
  }

  try {
    // Check the Connect account status
    const orgDoc = await getDoc(doc(db, "orgs", orgId));
    if (!orgDoc.exists()) {
      return NextResponse.redirect(
        `${appUrl}/dashboard?error=org_not_found`
      );
    }

    const orgData = orgDoc.data();
    const stripeAccountId = orgData.stripeAccountId;

    if (!stripeAccountId) {
      return NextResponse.redirect(
        `${appUrl}/dashboard?error=no_stripe_account`
      );
    }

    // Verify the account is set up for charges
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const isComplete = account.charges_enabled && account.details_submitted;

    await updateDoc(doc(db, "orgs", orgId), {
      stripeOnboardingComplete: isComplete,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.redirect(
      `${appUrl}/dashboard?stripe_connected=${isComplete}`
    );
  } catch (error) {
    console.error("Stripe callback error:", error);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=stripe_callback_failed`
    );
  }
}
