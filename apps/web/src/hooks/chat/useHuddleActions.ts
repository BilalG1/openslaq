import { useCallback, useEffect, useRef } from "react";
import { setCurrentHuddleChannel } from "@openslaq/client-core";
import type { ChannelId, MessageId, UserId } from "@openslaq/shared";
import { useChatStore } from "../../state/chat-store";
import { useCurrentUser } from "../useCurrentUser";
import { isTauri } from "../../lib/tauri";

/** Cleanup function returned when opening a huddle window */
type HuddleWindowHandle = {
  /** Listen for window close; calls `onClose` when detected */
  onClose: (cb: () => void) => void;
  /** Programmatically close the huddle window */
  close: () => void;
};

function openHuddleWindow(channelId: string, channelName?: string): HuddleWindowHandle | null {
  const nameParam = channelName ? `?name=${encodeURIComponent(channelName)}` : "";
  const path = `/huddle/${channelId}${nameParam}`;

  if (isTauri()) {
    // Use a Rust command to create the window — this ensures proper WKWebView
    // configuration for media device access (camera/microphone).
    const origin = window.location.origin;
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("open_huddle_window", {
        channelId,
        url: `${origin}${path}`,
        title: channelName ?? "Huddle",
      });
    });
    // We can't easily detect when a Tauri window closes from the main window.
    // The server handles cleanup via the huddle's beforeunload/disconnect events.
    return {
      onClose: () => {},
      close: () => {
        import("@tauri-apps/api/webviewWindow").then(async ({ WebviewWindow }) => {
          const win = await WebviewWindow.getByLabel(`huddle-${channelId}`);
          win?.destroy();
        });
      },
    };
  }

  const popup = window.open(path, `huddle-${channelId}`, "width=480,height=640,resizable=yes");
  if (!popup) return null;

  let pollId: ReturnType<typeof setInterval> | null = null;
  return {
    onClose: (cb) => {
      pollId = setInterval(() => {
        if (popup.closed) {
          if (pollId) clearInterval(pollId);
          cb();
        }
      }, 500);
    },
    close: () => {
      if (pollId) clearInterval(pollId);
      if (!popup.closed) popup.close();
    },
  };
}

export function useHuddleActions() {
  const user = useCurrentUser();
  const { state, dispatch } = useChatStore();
  const handleRef = useRef<HuddleWindowHandle | null>(null);

  const cleanupHuddle = useCallback((channelId: string) => {
    dispatch({ type: "huddle/ended", channelId: channelId as ChannelId });
    setCurrentHuddleChannel(dispatch, null);
    handleRef.current = null;
  }, [dispatch]);

  const startHuddle = useCallback(
    (channelId: string, channelName?: string) => {
      setCurrentHuddleChannel(dispatch, channelId);
      // Optimistically populate activeHuddles so the UI shows "In huddle" immediately
      if (user) {
        const now = new Date().toISOString();
        const tempMsgId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}` as MessageId;
        dispatch({
          type: "huddle/started",
          huddle: {
            channelId: channelId as ChannelId,
            participants: [{
              userId: user.id as UserId,
              isMuted: false,
              isCameraOn: false,
              isScreenSharing: false,
              joinedAt: now,
            }],
            startedAt: now,
            livekitRoom: null,
            screenShareUserId: null,
            messageId: tempMsgId,
          },
        });
        // Optimistic system message so the chat shows "X started a huddle" immediately
        dispatch({
          type: "messages/upsert",
          message: {
            id: tempMsgId,
            channelId: channelId as ChannelId,
            userId: user.id as UserId,
            content: "",
            type: "huddle",
            senderDisplayName: user.displayName ?? undefined,
            metadata: { huddleStartedAt: now },
            createdAt: now,
            updatedAt: now,
            attachments: [],
            reactions: [],
            replyCount: 0,
            isPinned: false,
            parentMessageId: null,
            latestReplyAt: null,
            mentions: [],
          },
        });
      }
      const handle = openHuddleWindow(channelId, channelName);
      handleRef.current = handle;
      handle?.onClose(() => cleanupHuddle(channelId));
    },
    [dispatch, user, cleanupHuddle],
  );

  const joinHuddle = useCallback(
    (channelId: string, channelName?: string) => {
      setCurrentHuddleChannel(dispatch, channelId);
      const handle = openHuddleWindow(channelId, channelName);
      handleRef.current = handle;
      handle?.onClose(() => cleanupHuddle(channelId));
    },
    [dispatch, cleanupHuddle],
  );

  const leaveHuddle = useCallback(() => {
    if (state.currentHuddleChannelId) {
      dispatch({ type: "huddle/ended", channelId: state.currentHuddleChannelId as ChannelId });
    }
    handleRef.current?.close();
    handleRef.current = null;
    setCurrentHuddleChannel(dispatch, null);
  }, [dispatch, state.currentHuddleChannelId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleRef.current?.close();
    };
  }, []);

  return {
    startHuddle,
    joinHuddle,
    leaveHuddle,
    currentHuddleChannelId: state.currentHuddleChannelId,
  };
}
