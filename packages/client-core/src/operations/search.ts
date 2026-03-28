import type { SearchResultItem } from "@openslaq/shared";
import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";

interface SearchMessagesParams {
  workspaceSlug: string;
  q: string;
  offset: number;
  limit: number;
  channelId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * If a date string is date-only (YYYY-MM-DD), convert it to an ISO datetime.
 * `fromDate` becomes start-of-day UTC; `toDate` becomes end-of-day UTC.
 */
function normalizeDateParam(
  value: string | undefined,
  endOfDay: boolean,
): string | undefined {
  if (!value) return undefined;
  // Already a full ISO datetime (contains "T")
  if (value.includes("T")) return value;
  return endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`;
}

export async function searchMessages(
  deps: ApiDeps,
  params: SearchMessagesParams,
): Promise<{ results: SearchResultItem[]; total: number }> {
  const { api, auth } = deps;
  const { workspaceSlug: slug, q, offset, limit, channelId, userId, fromDate, toDate } = params;

  const normalizedFromDate = normalizeDateParam(fromDate, false);
  const normalizedToDate = normalizeDateParam(toDate, true);

  const query: {
    q: string;
    offset: number;
    limit: number;
    channelId?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
  } = { q, offset, limit };
  if (channelId) query.channelId = channelId;
  if (userId) query.userId = userId;
  if (normalizedFromDate) query.fromDate = normalizedFromDate;
  if (normalizedToDate) query.toDate = normalizedToDate;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].search.$get(
      { param: { slug }, query },
      { headers },
    ),
  );

  return (await response.json()) as { results: SearchResultItem[]; total: number };
}
