/**
 * Deep-link URL parser and pending intent store for openslaq:// protocol.
 */

export type DeepLinkIntent =
  | { type: "open" }
  | { type: "invite"; code: string }
  | { type: "channel"; workspaceSlug: string; channelId: string }
  | { type: "dm"; workspaceSlug: string; dmChannelId: string }
  | { type: "thread"; workspaceSlug: string; channelId: string; messageId: string };

/**
 * Parse an openslaq:// URL into a typed intent.
 *
 * Supported formats:
 *   openslaq://open
 *   openslaq://invite/{code}
 *   openslaq://w/{slug}/c/{channelId}
 *   openslaq://w/{slug}/dm/{dmChannelId}
 *   openslaq://w/{slug}/c/{channelId}/t/{messageId}
 *
 * Unrecognized paths fall back to { type: "open" }.
 */
export function parseDeepLinkUrl(raw: string): DeepLinkIntent {
  // Handle both openslaq:// custom scheme and HTTP(S) URLs
  let stripped: string;
  if (raw.startsWith("openslaq://")) {
    stripped = raw.replace(/^openslaq:\/\//, "");
  } else {
    try {
      stripped = new URL(raw).pathname.replace(/^\//, "");
    } catch {
      stripped = raw;
    }
  }
  const segments = stripped.split("/").filter(Boolean);

  // openslaq://open or empty
  if (segments.length === 0 || (segments.length === 1 && segments[0] === "open")) {
    return { type: "open" };
  }

  // openslaq://invite/{code}
  if (segments[0] === "invite" && segments[1]) {
    return { type: "invite", code: segments[1] };
  }

  // All other recognized formats start with w/{slug}
  if (segments[0] !== "w" || segments.length < 2) {
    return { type: "open" };
  }

  const workspaceSlug = segments[1]!;

  // openslaq://w/{slug}/c/{channelId}/t/{messageId}
  if (segments.length >= 6 && segments[2] === "c" && segments[4] === "t") {
    return { type: "thread", workspaceSlug, channelId: segments[3]!, messageId: segments[5]! };
  }

  // openslaq://w/{slug}/c/{channelId}
  if (segments.length >= 4 && segments[2] === "c") {
    return { type: "channel", workspaceSlug, channelId: segments[3]! };
  }

  // openslaq://w/{slug}/dm/{dmChannelId}
  if (segments.length >= 4 && segments[2] === "dm") {
    return { type: "dm", workspaceSlug, dmChannelId: segments[3]! };
  }

  return { type: "open" };
}

// ── Pending intent store ──────────────────────────────────────────────
// Survives across re-mounts and auth redirects so cold-start deep links
// can be consumed after bootstrap completes.

type IntentListener = (intent: DeepLinkIntent) => void;

let pendingIntent: DeepLinkIntent | null = null;
const listeners = new Set<IntentListener>();

export function getPendingIntent(): DeepLinkIntent | null {
  return pendingIntent;
}

export function setPendingIntent(intent: DeepLinkIntent): void {
  pendingIntent = intent;
  for (const listener of listeners) {
    listener(intent);
  }
}

export function consumePendingIntent(): DeepLinkIntent | null {
  const intent = pendingIntent;
  pendingIntent = null;
  return intent;
}

export function subscribePendingIntent(listener: IntentListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
