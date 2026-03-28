import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";

export interface ChannelMember {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export async function listChannelMembers(
  deps: ApiDeps,
  slug: string,
  channelId: string,
): Promise<ChannelMember[]> {
  const { api, auth } = deps;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].members.$get(
      { param: { slug, id: channelId } },
      { headers },
    ),
  );
  return (await response.json()) as ChannelMember[];
}

export async function addChannelMember(
  deps: ApiDeps,
  slug: string,
  channelId: string,
  userId: string,
): Promise<void> {
  const { api, auth } = deps;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].members.$post(
      { param: { slug, id: channelId }, json: { userId } },
      { headers },
    ),
  );
}

export async function addChannelMembersBulk(
  deps: ApiDeps,
  slug: string,
  channelId: string,
  userIds: string[],
): Promise<{ added: number }> {
  const { api, auth } = deps;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].members.bulk.$post(
      { param: { slug, id: channelId }, json: { userIds } },
      { headers },
    ),
  );
  return (await response.json()) as { added: number };
}

export async function removeChannelMember(
  deps: ApiDeps,
  slug: string,
  channelId: string,
  userId: string,
): Promise<void> {
  const { api, auth } = deps;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].channels[":id"].members[":userId"].$delete(
      { param: { slug, id: channelId, userId } },
      { headers },
    ),
  );
}
