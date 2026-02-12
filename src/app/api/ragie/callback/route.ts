import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const connectionId = searchParams.get("connection_id");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Handle error from Ragie
  if (error) {
    console.error("Ragie connection error:", error);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=connection_failed`
    );
  }

  if (!connectionId) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=missing_connection_id`
    );
  }

  // Redirect to dashboard with connection_id - client will handle saving to Firestore
  return NextResponse.redirect(
    `${appUrl}/dashboard?connection_id=${connectionId}`
  );
}
