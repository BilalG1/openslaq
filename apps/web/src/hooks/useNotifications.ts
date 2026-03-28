import { useCallback, useRef } from "react";
import type { Message } from "@openslaq/shared";
import { useSocketEvent } from "./useSocketEvent";
import { useWindowFocused } from "./useWindowFocused";
import { useChatStore } from "../state/chat-store";
import { useCurrentUser } from "./useCurrentUser";
import { getNotificationPreferences } from "../lib/notification-preferences";
import { isTauri } from "../lib/tauri";

const MENTION_REGEX = /<@([^>]+)>/g;

function stripMarkdown(text: string): string {
  return text
    .replace(MENTION_REGEX, "@mention")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function useNotifications() {
  const user = useCurrentUser();
  const { state, dispatch } = useChatStore();
  const tauriFocused = useWindowFocused();
  const tauriFocusedRef = useRef(tauriFocused);
  tauriFocusedRef.current = tauriFocused;

  const handleNewMessage = useCallback(
    (message: Message) => {
      if (message.userId === user?.id) return;

      const isMentioned = message.mentions?.some((m) => m.userId === user?.id) ?? false;

      // Respect per-channel notification preferences
      const channelPref = state.channelNotificationPrefs[message.channelId] ?? "all";
      if (channelPref === "muted") return;
      if (channelPref === "mentions" && !isMentioned) return;

      // Skip thread replies unless user is mentioned
      if (message.parentMessageId && !isMentioned) return;

      // In Tauri, use reactive window focus state; in browser, read document.hidden directly
      const appFocused = isTauri() ? tauriFocusedRef.current : !document.hidden;

      // Skip if app is focused, unless user is mentioned (show notification for mentions even when focused but in different channel)
      if (appFocused && !isMentioned) return;

      const prefs = getNotificationPreferences();
      if (!prefs.enabled) return;

      const channel = state.channels.find((c) => c.id === message.channelId);
      const dm = state.dms.find((d) => d.channel.id === message.channelId);
      const groupDm = state.groupDms.find((g) => g.channel.id === message.channelId);
      const locationName = channel
        ? `#${channel.name}`
        : dm
          ? dm.otherUser.displayName
          : groupDm
            ? groupDm.members.map((m) => m.displayName).join(", ")
            : "Unknown";

      const preview = truncate(stripMarkdown(message.content), 100);
      const senderName = message.senderDisplayName ?? "Someone";

      const title = isMentioned
        ? `${senderName} mentioned you in ${locationName}`
        : senderName;
      const body = isMentioned
        ? preview
        : `${locationName}: ${preview}`;

      if (isTauri()) {
        import("@tauri-apps/plugin-notification").then(({ sendNotification }) => {
          sendNotification({ title, body });
        });
      } else {
        if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
        const notification = new Notification(title, { body });
        notification.onclick = () => {
          window.focus();
          if (channel) {
            dispatch({
              type: "workspace/selectChannel",
              channelId: message.channelId,
            });
          } else if (dm) {
            dispatch({
              type: "workspace/selectDm",
              channelId: message.channelId,
            });
          } else if (groupDm) {
            dispatch({
              type: "workspace/selectGroupDm",
              channelId: message.channelId,
            });
          }
          if (message.parentMessageId) {
            dispatch({
              type: "workspace/openThread",
              messageId: message.parentMessageId,
            });
          }
          const targetMessageId = message.parentMessageId ?? message.id;
          dispatch({
            type: "navigation/setScrollTarget",
            scrollTarget: {
              channelId: message.channelId,
              messageId: targetMessageId,
              highlightMessageId: targetMessageId,
              parentMessageId: message.parentMessageId ?? null,
            },
          });
          notification.close();
        };
      }

      if (prefs.sound) {
        new Audio("/notification.mp3").play().catch(() => {});
      }
    },
    [user?.id, state.channels, state.dms, state.groupDms, state.channelNotificationPrefs, dispatch],
  );

  useSocketEvent("message:new", handleNewMessage);
}
