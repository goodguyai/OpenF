import Stripe from "stripe";

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return _stripe;
}

const PLATFORM_FEE_PERCENT = parseInt(
  process.env.PLATFORM_FEE_PERCENT || "10",
  10
);

export async function createConnectAccount(email: string): Promise<string> {
  const account = await getStripe().accounts.create({
    type: "standard",
    email,
  });
  return account.id;
}

export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const link = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

export async function createSubscriptionPrice(
  connectedAccountId: string,
  amountInCents: number,
  productName: string
): Promise<{ productId: string; priceId: string }> {
  const product = await getStripe().products.create(
    { name: productName },
    { stripeAccount: connectedAccountId }
  );

  const price = await getStripe().prices.create(
    {
      product: product.id,
      unit_amount: amountInCents,
      currency: "usd",
      recurring: { interval: "month" },
    },
    { stripeAccount: connectedAccountId }
  );

  return { productId: product.id, priceId: price.id };
}

export async function createCheckoutSession(
  priceId: string,
  connectedAccountId: string,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string>
): Promise<string> {
  const session = await getStripe().checkout.sessions.create(
    {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        application_fee_percent: PLATFORM_FEE_PERCENT,
        metadata,
      },
      metadata,
    },
    { stripeAccount: connectedAccountId }
  );

  return session.url!;
}

export async function createPortalSession(
  customerId: string,
  connectedAccountId: string,
  returnUrl: string
): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create(
    {
      customer: customerId,
      return_url: returnUrl,
    },
    { stripeAccount: connectedAccountId }
  );

  return session.url;
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
