"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/client";

interface Org {
  id: string;
  name: string;
  subscriptionPriceInCents: number | null;
  stripePriceId: string | null;
  stripeOnboardingComplete: boolean;
}

export default function SelectCreatorPage() {
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, userData, loading: authLoading, subscribeToOrg } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login/user");
    }
  }, [user, authLoading, router]);

  // Redirect if already subscribed to an org
  useEffect(() => {
    if (!authLoading && userData?.subscribedOrgIds?.length) {
      router.push("/chat");
    }
  }, [userData, authLoading, router]);

  // Fetch available orgs
  useEffect(() => {
    const fetchOrgs = async () => {
      if (!user) return;
      
      try {
        // Get orgs that have a Ragie connection (active creators)
        const orgsQuery = query(
          collection(db, "orgs"),
          where("ragieConnectionId", "!=", null)
        );
        const snapshot = await getDocs(orgsQuery);
        const orgsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          subscriptionPriceInCents: doc.data().subscriptionPriceInCents || null,
          stripePriceId: doc.data().stripePriceId || null,
          stripeOnboardingComplete: doc.data().stripeOnboardingComplete || false,
        }));
        setOrgs(orgsList);
        // Auto-select if only one org
        if (orgsList.length === 1) {
          setSelectedOrgId(orgsList[0].id);
        }
      } catch (err) {
        console.error("Error fetching orgs:", err);
        setError("Failed to load creators. Please try again.");
      } finally {
        setLoadingOrgs(false);
      }
    };

    if (user) {
      fetchOrgs();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedOrgId) {
      setError("Please select a creator to follow");
      return;
    }

    setLoading(true);

    try {
      const selectedOrg = orgs.find((o) => o.id === selectedOrgId);

      // If creator has Stripe billing set up, redirect to checkout
      if (
        selectedOrg?.stripeOnboardingComplete &&
        selectedOrg?.stripePriceId
      ) {
        const idToken = await user?.getIdToken();
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ orgId: selectedOrgId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to start checkout");
        }

        const { url } = await response.json();
        window.location.href = url;
        return;
      }

      // Free access — subscribe directly
      await subscribeToOrg(selectedOrgId);
      router.push("/chat");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to subscribe";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Choose your creator
          </h1>
          <p className="mt-2 text-gray-600">
            Select a creator to get AI-powered answers from their expert analysis
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-red-500 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {loadingOrgs ? (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                <p className="text-sm text-gray-500">Loading creators...</p>
              </div>
            ) : orgs.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium">No creators available yet</p>
                <p className="mt-1 text-sm text-gray-500">
                  Check back soon for expert fantasy analysis!
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {orgs.map((org) => (
                    <label
                      key={org.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedOrgId === org.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="org"
                        value={org.id}
                        checked={selectedOrgId === org.id}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        className="sr-only"
                      />
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          selectedOrgId === org.id
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {org.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{org.name}</p>
                        <p className="text-sm text-gray-500">
                          {org.subscriptionPriceInCents
                            ? `$${(org.subscriptionPriceInCents / 100).toFixed(2)}/mo`
                            : "Free access"}
                        </p>
                      </div>
                      {selectedOrgId === org.id && (
                        <svg
                          className="w-5 h-5 text-emerald-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedOrgId}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Starting...</span>
                    </>
                  ) : (
                    (() => {
                      const sel = orgs.find((o) => o.id === selectedOrgId);
                      return sel?.stripePriceId
                        ? `Subscribe — $${((sel.subscriptionPriceInCents || 0) / 100).toFixed(2)}/mo`
                        : "Start chatting";
                    })()
                  )}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
