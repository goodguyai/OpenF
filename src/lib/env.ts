const requiredServerEnvVars = [
  "OPENAI_API_KEY",
  "RAGIE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
] as const;

const optionalServerEnvVars = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

export function validateEnv(): void {
  const missing = requiredServerEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  const missingOptional = optionalServerEnvVars.filter(
    (key) => !process.env[key]
  );
  if (missingOptional.length > 0) {
    console.warn(
      `Missing optional environment variables (Stripe features disabled): ${missingOptional.join(", ")}`
    );
  }
}

// Validate on module load
validateEnv();
