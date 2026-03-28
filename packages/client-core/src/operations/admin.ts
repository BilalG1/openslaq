import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";

export async function checkAdmin(deps: ApiDeps): Promise<{ isAdmin: boolean }> {
  const { api, auth } = deps;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.admin.check.$get({}, { headers }),
  );
  return (await res.json()) as { isAdmin: boolean };
}

export async function getStats(deps: ApiDeps): Promise<{
  users: number;
  workspaces: number;
  channels: number;
  messages: number;
  attachments: number;
  reactions: number;
} | null> {
  const { api, auth } = deps;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.admin.stats.$get({}, { headers }),
  );
  return (await res.json()) as {
    users: number;
    workspaces: number;
    channels: number;
    messages: number;
    attachments: number;
    reactions: number;
  };
}

export async function getActivity(deps: ApiDeps, days = 30): Promise<{
  messagesPerDay: { date: string; count: number }[];
  usersPerDay: { date: string; count: number }[];
} | null> {
  const { api, auth } = deps;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.admin.activity.$get({ query: { days: String(days) } }, { headers }),
  );
  return (await res.json()) as {
    messagesPerDay: { date: string; count: number }[];
    usersPerDay: { date: string; count: number }[];
  };
}

export async function getUsers(
  deps: ApiDeps,
  page = 1,
  pageSize = 20,
  search?: string,
): Promise<{
  users: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    lastSeenAt: string | null;
    createdAt: string;
    messageCount: number;
    workspaceCount: number;
  }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} | null> {
  const { api, auth } = deps;

  const query: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  };
  if (search) query.search = search;
  const res = await authorizedRequest(auth, (headers) =>
    api.api.admin.users.$get({ query }, { headers }),
  );
  return (await res.json()) as {
    users: {
      id: string;
      displayName: string;
      email: string;
      avatarUrl: string | null;
      lastSeenAt: string | null;
      createdAt: string;
      messageCount: number;
      workspaceCount: number;
    }[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export async function getWorkspaces(
  deps: ApiDeps,
  page = 1,
  pageSize = 20,
  search?: string,
): Promise<{
  workspaces: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    memberCount: number;
    channelCount: number;
    messageCount: number;
  }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} | null> {
  const { api, auth } = deps;

  const query: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  };
  if (search) query.search = search;
  const res = await authorizedRequest(auth, (headers) =>
    api.api.admin.workspaces.$get({ query }, { headers }),
  );
  return (await res.json()) as {
    workspaces: {
      id: string;
      name: string;
      slug: string;
      createdAt: string;
      memberCount: number;
      channelCount: number;
      messageCount: number;
    }[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export async function impersonate(
  deps: ApiDeps,
  userId: string,
): Promise<{ snippet: string } | null> {
  const { api, auth } = deps;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.admin.impersonate[":userId"].$post(
      { param: { userId } },
      { headers },
    ),
  );
  return (await res.json()) as { snippet: string };
}
