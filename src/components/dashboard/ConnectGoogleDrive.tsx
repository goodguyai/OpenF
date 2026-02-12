"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/client";

export default function ConnectGoogleDrive() {
  const { user, userData, orgData, refreshOrgData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const saveConnectionId = useCallback(
    async (connectionId: string) => {
      if (!userData?.orgId) return;

      try {
        // Save connection ID to org document in Firestore
        await updateDoc(doc(db, "orgs", userData.orgId), {
          ragieConnectionId: connectionId,
          updatedAt: serverTimestamp(),
        });

        setMessage({
          type: "success",
          text: "Google Drive connected successfully!",
        });
        await refreshOrgData();

        // Clean up URL
        router.replace("/dashboard");
      } catch (error) {
        console.error("Error saving connection:", error);
        setMessage({
          type: "error",
          text: "Failed to save connection. Please try again.",
        });
      }
    },
    [userData?.orgId, refreshOrgData, router]
  );

  useEffect(() => {
    // Check for connection_id or error params from callback
    const connectionId = searchParams.get("connection_id");
    const error = searchParams.get("error");

    if (connectionId) {
      saveConnectionId(connectionId);
    } else if (error) {
      const errorMessages: Record<string, string> = {
        connection_failed: "Failed to connect Google Drive. Please try again.",
        missing_connection_id: "Connection incomplete. Please try again.",
      };
      setMessage({
        type: "error",
        text: errorMessages[error] || "An error occurred. Please try again.",
      });
      // Clean up URL
      router.replace("/dashboard");
    }
  }, [searchParams, saveConnectionId, router]);

  const handleConnect = async () => {
    if (!userData?.orgId) return;

    setLoading(true);
    setMessage(null);

    try {
      // Get Ragie OAuth URL - use orgId for partition
      const idToken = await user?.getIdToken();
      const response = await fetch("/api/ragie/init-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orgId: userData.orgId }),
      });

      if (!response.ok) {
        throw new Error("Failed to initialize connection");
      }

      const { url } = await response.json();

      // Redirect to Ragie
      window.location.href = url;
    } catch (error) {
      console.error("Error connecting:", error);
      setMessage({
        type: "error",
        text: "Failed to start connection. Please try again.",
      });
      setLoading(false);
    }
  };

  const isConnected = !!orgData?.ragieConnectionId;

  return (
    <div className="bg-white rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-5">
          {/* Google Drive Icon */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200/50 border border-gray-100">
              <svg className="w-8 h-8" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFC107" d="M17 6L31 6 45 30 31 30z"/>
                <path fill="#1976D2" d="M9.875 42L16.938 30 45 30 37.938 42z"/>
                <path fill="#4CAF50" d="M3 30L17 6 24 18 16.938 30z"/>
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Google Drive
              </h3>
              {isConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Connected
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              Connect the folder where you store your fantasy analysis, rankings, 
              articles, and sports content. We&apos;ll keep it synced automatically.
            </p>

            {/* Connection details */}
            {isConnected && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-sm">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  <span className="text-gray-600">Connection ID:</span>
                  <code className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700 font-mono">
                    {orgData?.ragieConnectionId?.slice(0, 20)}...
                  </code>
                </div>
              </div>
            )}

            {/* Messages */}
            {message && (
              <div
                className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${
                  message.type === "success"
                    ? "bg-green-50 border border-green-100"
                    : "bg-red-50 border border-red-100"
                }`}
              >
                {message.type === "success" ? (
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
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
                )}
                <p
                  className={`text-sm ${
                    message.type === "success"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            )}

            {/* Action button */}
            <div className="mt-5">
              {isConnected ? (
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
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
                      Reconnecting...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Reconnect
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/25"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
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
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      Connect Google Drive
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer with sync info */}
      {!isConnected && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Secure OAuth connection
            </div>
            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Auto-sync every 4 hours
            </div>
            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              All file types supported
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
