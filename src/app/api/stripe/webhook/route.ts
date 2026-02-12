import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    const body = await request.text();
    event = constructWebhookEvent(body, signature);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const orgId = session.metadata?.orgId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && orgId) {
          // Add org to user's subscriptions
          await updateDoc(doc(db, "users", userId), {
            subscribedOrgIds: arrayUnion(orgId),
            stripeCustomerId: customerId,
            activeSubscriptions: arrayUnion({
              orgId,
              stripeSubscriptionId: subscriptionId,
              connectedAccountId: session.metadata?.connectedAccountId || "",
            }),
            updatedAt: serverTimestamp(),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const subMetadata = subscription.metadata;
        const userId = subMetadata?.userId;
        const orgId = subMetadata?.orgId;

        if (userId && orgId) {
          // Get current user data to find the subscription entry to remove
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const subToRemove = userData.activeSubscriptions?.find(
              (s: { orgId: string }) => s.orgId === orgId
            );

            const updates: Record<string, unknown> = {
              subscribedOrgIds: arrayRemove(orgId),
              updatedAt: serverTimestamp(),
            };
            if (subToRemove) {
              updates.activeSubscriptions = arrayRemove(subToRemove);
            }

            await updateDoc(doc(db, "users", userId), updates);
          }
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object;
        const isComplete =
          account.charges_enabled && account.details_submitted;

        // Find the org with this Stripe account ID and update it
        // Since we store stripeAccountId on the org, we need to find it
        // For simplicity, we rely on the connect callback for initial setup
        // This handler catches subsequent status changes
        if (account.metadata?.orgId) {
          await updateDoc(doc(db, "orgs", account.metadata.orgId), {
            stripeOnboardingComplete: isComplete,
            updatedAt: serverTimestamp(),
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
