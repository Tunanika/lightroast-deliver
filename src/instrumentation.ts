// Runs once at server boot. Validates configuration so the app refuses to
// start (loudly) when something critical like JWT_SECRET is missing.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env");
    validateEnv();
  }
}
