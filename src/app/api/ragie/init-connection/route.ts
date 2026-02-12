import "@/lib/env";
import { NextRequest, NextResponse } from "next/server";
import { initGoogleDriveConnection } from "@/lib/ragie";
import { verifyFirebaseToken } from "@/lib/firebase/auth-verify";

export async function POST(request: NextRequest) {
  try {
    // Verify Firebase auth token
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
        { error: "Missing orgId" },
        { status: 400 }
      );
    }

    // Only the org owner can initiate a connection
    if (verifiedUser.uid !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/api/ragie/callback`;

    const result = await initGoogleDriveConnection({
      orgId,
      redirectUri,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error initializing Ragie connection:", error);
    return NextResponse.json(
      { error: "Failed to initialize connection" },
      { status: 500 }
    );
  }
}
