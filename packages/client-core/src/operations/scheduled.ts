import { authorizedRequest } from "../api/api-client";
import type { ScheduledMessage } from "@openslaq/shared";
import type { OperationDeps } from "./types";

export interface ScheduledMessageItem extends ScheduledMessage {
  channelName: string;
}

export async function createScheduledMessageOp(
  deps: OperationDeps,
  params: {
    workspaceSlug: string;
    channelId: string;
    content: string;
    scheduledFor: string;
    attachmentIds?: string[];
  },
): Promise<ScheduledMessage> {
  const { api, auth } = deps;
  const { workspaceSlug, channelId, content, scheduledFor, attachmentIds } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"]["scheduled-messages"].$post(
      {
        param: { slug: workspaceSlug },
        json: { channelId, content, scheduledFor, attachmentIds: attachmentIds ?? [] },
      },
      { headers },
    ),
  );
  return (await res.json()) as ScheduledMessage;
}

export async function fetchScheduledMessages(
  deps: OperationDeps,
  params: { workspaceSlug: string },
): Promise<ScheduledMessageItem[]> {
  const { api, auth } = deps;
  const { workspaceSlug } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"]["scheduled-messages"].$get(
      { param: { slug: workspaceSlug } },
      { headers },
    ),
  );
  const data = (await res.json()) as { scheduledMessages: ScheduledMessageItem[] };
  return data.scheduledMessages;
}

export async function fetchScheduledCountForChannel(
  deps: OperationDeps,
  params: { workspaceSlug: string; channelId: string },
): Promise<number> {
  const { api, auth } = deps;
  const { workspaceSlug, channelId } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"]["scheduled-messages"].channel[":channelId"].$get(
      { param: { slug: workspaceSlug, channelId } },
      { headers },
    ),
  );
  const data = (await res.json()) as { count: number };
  return data.count;
}

export async function updateScheduledMessageOp(
  deps: OperationDeps,
  params: {
    workspaceSlug: string;
    id: string;
    content?: string;
    scheduledFor?: string;
    attachmentIds?: string[];
  },
): Promise<ScheduledMessage> {
  const { api, auth } = deps;
  const { workspaceSlug, id, ...updates } = params;

  const res = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"]["scheduled-messages"][":id"].$put(
      {
        param: { slug: workspaceSlug, id },
        json: updates,
      },
      { headers },
    ),
  );
  return (await res.json()) as ScheduledMessage;
}

export async function deleteScheduledMessageOp(
  deps: OperationDeps,
  params: { workspaceSlug: string; id: string },
): Promise<void> {
  const { api, auth } = deps;
  const { workspaceSlug, id } = params;

  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"]["scheduled-messages"][":id"].$delete(
      { param: { slug: workspaceSlug, id } },
      { headers },
    ),
  );
}
