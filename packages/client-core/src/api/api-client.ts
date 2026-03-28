import type { AuthProvider } from "../platform/types";
import { ApiError, AuthError } from "./errors";

type ResponseLike = {
  status: number;
  ok: boolean;
  clone: () => { json: () => Promise<unknown> };
};

export async function authorizedHeaders(auth: AuthProvider): Promise<{ Authorization: string }> {
  const token = await auth.requireAccessToken();
  return { Authorization: `Bearer ${token}` };
}

export async function authorizedRequest<TResponse extends ResponseLike>(
  auth: AuthProvider,
  request: (headers: { Authorization: string }) => Promise<TResponse>,
): Promise<TResponse> {
  const headers = await authorizedHeaders(auth);
  const response = await request(headers);

  if (response.status === 401) {
    auth.onAuthRequired();
    throw new AuthError();
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.clone().json()) as { error?: string };
      if (typeof body.error === "string" && body.error.trim().length > 0) {
        message = body.error;
      }
    } catch {
      // Ignore non-JSON responses and preserve default message.
    }
    throw new ApiError(response.status, message);
  }

  return response;
}

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

function isRetryable(err: unknown): boolean {
  if (err instanceof AuthError) return false;
  if (err instanceof ApiError) return RETRYABLE_STATUS_CODES.has(err.status);
  if (err instanceof TypeError) return true; // network error (fetch failure)
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; baseDelay?: number },
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2;
  const baseDelay = options?.baseDelay ?? 500;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelay * 2 ** attempt));
    }
  }
  throw lastError;
}
