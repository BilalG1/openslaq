import { useCallback, useEffect, useRef, useState } from "react";
import type { UserId, ChannelId } from "@openslaq/shared";
import { useSocketEvent } from "./useSocketEvent";

export interface TypingUser {
  userId: UserId;
  displayName: string;
  expiresAt: number;
}

interface MemberInfo {
  id: UserId;
  displayName: string;
}

const EXPIRE_MS = 5000;

export function useTypingTracking(
  channelId: ChannelId | undefined,
  currentUserId: UserId | undefined,
  members: MemberInfo[],
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear on channel change
  useEffect(() => {
    setTypingUsers([]);
  }, [channelId]);

  // Expiry timer
  useEffect(() => {
    if (typingUsers.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        setTypingUsers((prev) => {
          const filtered = prev.filter((u) => u.expiresAt > now);
          return filtered.length === prev.length ? prev : filtered;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [typingUsers.length]);

  const onUserTyping = useCallback(
    (payload: { userId: UserId; channelId: ChannelId }) => {
      if (payload.channelId !== channelId) return;
      if (payload.userId === currentUserId) return;

      const member = members.find((m) => m.id === payload.userId);
      const displayName = member?.displayName ?? "Someone";

      setTypingUsers((prev) => {
        const existing = prev.findIndex((u) => u.userId === payload.userId);
        const entry: TypingUser = {
          userId: payload.userId,
          displayName,
          expiresAt: Date.now() + EXPIRE_MS,
        };
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = entry;
          return next;
        }
        return [...prev, entry];
      });
    },
    [channelId, currentUserId, members],
  );

  const onNewMessage = useCallback(
    (message: { userId: UserId; channelId: ChannelId }) => {
      if (message.channelId !== channelId) return;
      setTypingUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== message.userId);
        return filtered.length === prev.length ? prev : filtered;
      });
    },
    [channelId],
  );

  useSocketEvent("user:typing", onUserTyping);
  useSocketEvent("message:new", onNewMessage);

  return typingUsers;
}
