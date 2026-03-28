import * as jose from "jose";
import { env } from "../env";

const projectId = env.VITE_STACK_PROJECT_ID;

// Stack Auth JWKS — only available when AUTH_MODE=stack-auth
export const jwks = projectId
  ? jose.createRemoteJWKSet(
      new URL(
        `https://api.stack-auth.com/api/v1/projects/${projectId}/.well-known/jwks.json`,
      ),
      { timeoutDuration: 5000 },
    )
  : null;

export const jwtVerifyOptions = projectId
  ? {
      issuer: `https://api.stack-auth.com/api/v1/projects/${projectId}`,
      audience: projectId,
    }
  : null;

// HMAC secret for e2e tests — only active in development/test
const isDevOrTest = process.env.NODE_ENV !== "production";

export const e2eTestSecret = (() => {
  if (!env.E2E_TEST_SECRET) return null;

  if (!isDevOrTest) {
    console.warn(
      "WARNING: E2E_TEST_SECRET is set in production. HMAC auth bypass is disabled in production mode.",
    );
    return null;
  }

  return new TextEncoder().encode(env.E2E_TEST_SECRET);
})();

// Builtin auth secret — only available when AUTH_MODE=builtin
export const builtinJwtSecret = env.AUTH_JWT_SECRET
  ? new TextEncoder().encode(env.AUTH_JWT_SECRET)
  : null;
