"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userData, loading, refreshUserData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle post-checkout subscription activation
  useEffect(() => {
    const subscribedOrgId = searchParams.get("subscribed");
    if (subscribedOrgId && user) {
      refreshUserData().then(() => {
        router.replace("/chat");
      });
    }
  }, [searchParams, user, refreshUserData, router]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login/user");
    }
  }, [user, loading, router]);

  // Redirect to select-creator if user has no subscriptions (and isn't a creator)
  useEffect(() => {
    if (!loading && user && userData) {
      const hasAccess =
        userData.orgId || // Creator with their own org
        (userData.subscribedOrgIds && userData.subscribedOrgIds.length > 0); // User with subscriptions

      if (!hasAccess) {
        router.push("/select-creator");
      }
    }
  }, [user, userData, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center animate-pulse">
            <svg
              className="w-7 h-7 text-white"
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
