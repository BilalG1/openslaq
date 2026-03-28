import { useCallback, useEffect, useRef, useState } from "react";
import type { ChannelId, UserId } from "@openslaq/shared";
import { useSocketEvent } from "../useSocketEvent";

export interface TypingUser {
  userId: string;
  displayName: string;
  expiresAt: number;
}

interface MemberInfo {
  id: string;
  displayName: string;
}

const EXPIRE_MS = 5000;

interface Options {
  onUnknownUser?: () => void;
}

export function useTypingTracking(
  channelId: string | undefined,
  currentUserId: string | undefined,
  members: MemberInfo[],
  options?: Options,
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prevChannelIdRef = useRef(channelId);
  if (prevChannelIdRef.current !== channelId) {
    prevChannelIdRef.current = channelId;
    setTypingUsers([]);
  }

  useEffect(() => {
    if (typingUsers.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        setTypingUsers((prev) => {
          const filtered = prev.filter((entry) => entry.expiresAt > now);
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

  const onUnknownUserRef = useRef(options?.onUnknownUser);
  onUnknownUserRef.current = options?.onUnknownUser;

  const onUserTyping = useCallback(
    (payload: { userId: UserId; channelId: ChannelId }) => {
      if (payload.channelId !== channelId) return;
      if (payload.userId === currentUserId) return;

      const member = members.find((item) => item.id === payload.userId);
      if (!member) {
        onUnknownUserRef.current?.();
        return;
      }
      const displayName = member.displayName;

      setTypingUsers((prev) => {
        const existingIndex = prev.findIndex((entry) => entry.userId === payload.userId);
        const nextEntry: TypingUser = {
          userId: payload.userId,
          displayName,
          expiresAt: Date.now() + EXPIRE_MS,
        };
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = nextEntry;
          return next;
        }
        return [...prev, nextEntry];
      });
    },
    [channelId, currentUserId, members],
  );

  const onNewMessage = useCallback(
    (message: { userId: string; channelId: string }) => {
      if (message.channelId !== channelId) return;
      setTypingUsers((prev) => {
        const filtered = prev.filter((entry) => entry.userId !== message.userId);
        return filtered.length === prev.length ? prev : filtered;
      });
    },
    [channelId],
  );

  useSocketEvent("user:typing", onUserTyping);
  useSocketEvent("message:new", onNewMessage);

  return typingUsers;
}
