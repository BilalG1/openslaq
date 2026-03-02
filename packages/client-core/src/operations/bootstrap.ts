import { AuthError, getErrorMessage } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import {
  normalizeChannel,
  normalizeDmConversation,
  normalizeGroupDmConversation,
  normalizeWorkspaceInfo,
} from "./normalize";
import type { OperationDeps } from "./types";

interface BootstrapParams {
  workspaceSlug: string;
  urlChannelId?: string;
  urlDmChannelId?: string;
}

export async function bootstrapWorkspace(
  deps: OperationDeps,
  params: BootstrapParams,
): Promise<void> {
  const { api, auth, dispatch } = deps;
  const { workspaceSlug: slug, urlChannelId, urlDmChannelId } = params;

  dispatch({ type: "workspace/bootstrapStart", workspaceSlug: slug });

  try {
    const [channelsRes, workspacesRes, dmsRes, groupDmsRes, unreadRes, presenceRes, starredRes, notifyPrefsRes, emojiRes] = await Promise.all([
      authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"].channels.$get({ param: { slug } }, { headers }),
      ),
      authorizedRequest(auth, (headers) =>
        api.api.workspaces.$get({}, { headers }),
      ),
      authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"].dm.$get({ param: { slug } }, { headers }),
      ),
      authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"]["group-dm"].$get({ param: { slug } }, { headers }),
      ),
      authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"]["unread-counts"].$get({ param: { slug } }, { headers }),
      ),
      authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"].presence.$get({ param: { slug } }, { headers }),
      ),
      authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"].channels.starred.$get({ param: { slug } }, { headers }),
      ),
      authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"].channels["notification-prefs"].$get({ param: { slug } }, { headers }),
      ),
      authorizedRequest(auth, (headers) =>
        api.api.workspaces[":slug"].emoji.$get({ param: { slug } }, { headers }),
      ),
    ]);

    const channels = (await channelsRes.json()).map(normalizeChannel);
    const workspaces = (await workspacesRes.json()).map(normalizeWorkspaceInfo);
    const dmsData = (await dmsRes.json()).map(normalizeDmConversation);
    const groupDmsData = (await groupDmsRes.json()).map(normalizeGroupDmConversation);
    const unreadCounts = (await unreadRes.json()) as Record<string, number>;
    const presenceData = (await presenceRes.json()) as Array<{
      userId: string;
      online: boolean;
      lastSeenAt: string | null;
    }>;

    const starredChannelIds = (await starredRes.json()) as string[];
    const notifyPrefs = (await notifyPrefsRes.json()) as Record<string, import("@openslaq/shared").ChannelNotifyLevel>;
    const emojiData = (await emojiRes.json()) as { emojis: import("@openslaq/shared").CustomEmoji[] };

    dispatch({ type: "workspace/bootstrapSuccess", channels, workspaces, dms: dmsData, groupDms: groupDmsData });
    dispatch({ type: "unread/setCounts", counts: unreadCounts });
    dispatch({ type: "presence/sync", users: presenceData });
    dispatch({ type: "stars/set", channelIds: starredChannelIds });
    dispatch({ type: "notifyPrefs/set", prefs: notifyPrefs });
    dispatch({ type: "emoji/set", emojis: emojiData.emojis });

    // Honor URL params, then fall back to #general (or first channel)
    if (urlDmChannelId && dmsData.some((dm) => dm.channel.id === urlDmChannelId)) {
      dispatch({ type: "workspace/selectDm", channelId: urlDmChannelId });
    } else if (urlDmChannelId && groupDmsData.some((g) => g.channel.id === urlDmChannelId)) {
      dispatch({ type: "workspace/selectGroupDm", channelId: urlDmChannelId });
    } else if (urlChannelId && channels.some((c) => c.id === urlChannelId)) {
      dispatch({ type: "workspace/selectChannel", channelId: urlChannelId });
    } else {
      const defaultChannel = channels.find((c) => c.name === "general") ?? channels[0];
      if (defaultChannel) {
        dispatch({ type: "workspace/selectDefaultChannel", channelId: defaultChannel.id });
      }
    }
  } catch (err) {
    if (err instanceof AuthError) {
      auth.onAuthRequired();
      return;
    }
    dispatch({
      type: "workspace/bootstrapError",
      error: getErrorMessage(err, "Failed to load workspace data"),
    });
  }
}
