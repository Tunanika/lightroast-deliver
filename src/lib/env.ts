// Environment access + validation.
// Edge-safe: only reads process.env, no Node APIs. Getters (not top-level
// reads) so importing this never throws during build or in the edge runtime.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Throws if anything is misconfigured. Called once at boot (instrumentation). */
export function validateEnv(): void {
  required("ADMIN_USERNAME");
  required("ADMIN_PASSWORD");
  const secret = required("JWT_SECRET");
  if (secret.length < 32) {
    throw new Error(
      `JWT_SECRET must be at least 32 characters (got ${secret.length}).`,
    );
  }
  required("NAS_MOUNT_PATH");
  required("DATABASE_URL");
}

export const env = {
  get adminUsername(): string {
    return required("ADMIN_USERNAME");
  },
  get adminPassword(): string {
    return required("ADMIN_PASSWORD");
  },
  get jwtSecret(): string {
    const secret = required("JWT_SECRET");
    if (secret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters.");
    }
    return secret;
  },
  get nasMountPath(): string {
    return required("NAS_MOUNT_PATH");
  },
  get databaseUrl(): string {
    return required("DATABASE_URL");
  },
  /** Cookies marked Secure only when explicitly enabled (HTTPS deployments). */
  get cookieSecure(): boolean {
    return process.env.COOKIE_SECURE === "true";
  },
};
