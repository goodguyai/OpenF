interface VerifiedUser {
  uid: string;
  email: string;
}

export async function verifyFirebaseToken(
  idToken: string
): Promise<VerifiedUser | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey || !idToken) return null;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const user = data.users?.[0];
    if (!user) return null;

    return { uid: user.localId, email: user.email };
  } catch {
    return null;
  }
}
