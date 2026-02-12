"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import ConnectGoogleDrive from "@/components/dashboard/ConnectGoogleDrive";

export default function DashboardPage() {
  const { user, userData, orgData, refreshOrgData } = useAuth();
  const [priceInput, setPriceInput] = useState("");
  const [pricingLoading, setPricingLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [pricingMessage, setPricingMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isStripeConnected = !!orgData?.stripeOnboardingComplete;
  const hasPrice = !!orgData?.stripePriceId;
  const subscriptionPriceInCents = orgData?.subscriptionPriceInCents;
  const displayPrice = subscriptionPriceInCents
    ? (subscriptionPriceInCents / 100).toFixed(2)
    : null;

  const handleStripeConnect = async () => {
    if (!userData?.orgId) return;
    setStripeLoading(true);

    try {
      const idToken = await user?.getIdToken();
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orgId: userData.orgId }),
      });

      if (!response.ok) throw new Error("Failed to start onboarding");

      const { url } = await response.json();
      window.location.href = url;
    } catch {
      setPricingMessage({
        type: "error",
        text: "Failed to start payment setup. Please try again.",
      });
      setStripeLoading(false);
    }
  };

  const handleSetPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.orgId) return;

    const amount = parseFloat(priceInput);
    if (isNaN(amount) || amount < 1) {
      setPricingMessage({
        type: "error",
        text: "Price must be at least $1.00",
      });
      return;
    }

    setPricingLoading(true);
    setPricingMessage(null);

    try {
      const idToken = await user?.getIdToken();
      const response = await fetch("/api/stripe/price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orgId: userData.orgId,
          amountInCents: Math.round(amount * 100),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set price");
      }

      setPricingMessage({
        type: "success",
        text: `Subscription price set to $${amount.toFixed(2)}/mo`,
      });
      setPriceInput("");
      await refreshOrgData();
    } catch (err) {
      setPricingMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to set price",
      });
    } finally {
      setPricingLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-green-600">
            All systems operational
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back
          {orgData?.name && (
            <span className="text-gray-400 font-normal text-2xl ml-2">
              {orgData.name}
            </span>
          )}
        </h1>
        <p className="mt-2 text-gray-600">
          Sync your fantasy analysis and sports content to start earning.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-200/50 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Content</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {orgData?.ragieConnectionId ? "Connected" : "Not connected"}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                orgData?.ragieConnectionId
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {orgData?.ragieConnectionId ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-200/50 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Payments</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {isStripeConnected ? "Active" : "Not set up"}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isStripeConnected
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-200/50 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Price</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {displayPrice ? `$${displayPrice}/mo` : "—"}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                hasPrice ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sources Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Content Sources</h2>
        <p className="text-sm text-gray-500">Connect where you store your articles, rankings, and analysis</p>
      </div>

      <ConnectGoogleDrive />

      {/* Payments Section */}
      <div className="mt-8 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Payments</h2>
        <p className="text-sm text-gray-500">Set up Stripe to accept subscriptions from fans</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200/50 border border-gray-100">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Stripe Payments</h3>
                {isStripeConnected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Connected
                  </span>
                )}
              </div>

              {!isStripeConnected ? (
                <>
                  <p className="mt-1.5 text-sm text-gray-500">
                    Connect your Stripe account to accept monthly subscriptions from fans.
                  </p>
                  <div className="mt-5">
                    <button
                      onClick={handleStripeConnect}
                      disabled={stripeLoading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/25"
                    >
                      {stripeLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Setting up...
                        </>
                      ) : (
                        "Set up payments"
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-1.5 text-sm text-gray-500">
                    Your Stripe account is connected and ready to accept payments.
                  </p>
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Monthly Subscription Price</h4>
                    {displayPrice && (
                      <p className="text-sm text-gray-600 mb-3">
                        Current price: <span className="font-semibold text-gray-900">${displayPrice}/mo</span>
                      </p>
                    )}
                    <form onSubmit={handleSetPrice} className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          placeholder={displayPrice || "9.99"}
                          className="w-full pl-7 pr-12 py-2.5 rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/mo</span>
                      </div>
                      <button
                        type="submit"
                        disabled={pricingLoading || !priceInput}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {pricingLoading ? "Saving..." : hasPrice ? "Update" : "Set price"}
                      </button>
                    </form>
                  </div>
                </>
              )}

              {pricingMessage && (
                <div
                  className={`mt-4 p-4 rounded-xl ${
                    pricingMessage.type === "success"
                      ? "bg-green-50 border border-green-100"
                      : "bg-red-50 border border-red-100"
                  }`}
                >
                  <p className={`text-sm ${pricingMessage.type === "success" ? "text-green-700" : "text-red-700"}`}>
                    {pricingMessage.text}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Test Your Bot Card */}
      {orgData?.ragieConnectionId && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Test Your Bot</h3>
                <p className="mt-1 text-sm text-gray-500">Try out the AI chat powered by your content</p>
              </div>
            </div>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200"
            >
              Open Chat
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Info Section */}
      {orgData?.ragieConnectionId && (
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Your content is syncing</h3>
              <p className="mt-1 text-sm text-gray-600">
                Your articles and analysis are being processed. New content syncs every 4 hours.
                When fans ask questions, your expertise will power their answers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
