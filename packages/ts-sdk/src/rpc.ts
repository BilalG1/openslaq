import { hc } from "hono/client";
import type { ClientResponse } from "hono/client";
import type { AppType } from "@openslaq/api/app";
import { OpenSlaqApiError } from "./errors";

export type RpcClient = ReturnType<typeof hc<AppType>>;

export function createRpcClient(
  baseUrl: string,
  apiKey: string,
  customFetch?: typeof globalThis.fetch,
): RpcClient {
  return hc<AppType>(baseUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
    fetch: customFetch,
  });
}

/**
 * From a union of ClientResponse types, extract only those with 2xx status.
 * For example: ClientResponse<Channel, 200> | ClientResponse<{error: string}, 400>
 * becomes:     ClientResponse<Channel, 200>
 */
type ExtractSuccess<T> = T extends ClientResponse<infer B, infer S, infer F>
  ? S extends 200 | 201 | 204
    ? ClientResponse<B, S, F>
    : never
  : T;

/**
 * Checks response status and throws OpenSlaqApiError on failure.
 * Narrows the Hono ClientResponse union to only success types so
 * .json() returns the success body without error variants.
 */
export async function checked<T extends Response>(response: T): Promise<ExtractSuccess<T>> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) errorMessage = body.error;
    } catch {
      // Use default error message
    }
    throw new OpenSlaqApiError(response.status, errorMessage);
  }
  return response as ExtractSuccess<T>;
}
