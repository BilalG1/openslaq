import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { FlatList } from "react-native";
import type { Message } from "@openslaq/shared";
import type { ScrollTarget } from "@openslaq/client-core";

interface Params {
  scrollTarget: ScrollTarget | null;
  messages: Message[];
  listRef: RefObject<FlatList<Message> | null>;
  isInitialLoading: boolean;
  canLoadOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onResolve: (messageId: string) => void;
  onExhausted: () => void;
}

export function useMessageScrollTarget({
  scrollTarget,
  messages,
  listRef,
  isInitialLoading,
  canLoadOlder,
  loadingOlder,
  onLoadOlder,
  onResolve,
  onExhausted,
}: Params) {
  // Store callbacks in refs so the effect doesn't re-fire when callers pass
  // inline (un-memoized) functions.
  const onLoadOlderRef = useRef(onLoadOlder);
  const onResolveRef = useRef(onResolve);
  const onExhaustedRef = useRef(onExhausted);
  onLoadOlderRef.current = onLoadOlder;
  onResolveRef.current = onResolve;
  onExhaustedRef.current = onExhausted;

  useEffect(() => {
    if (!scrollTarget) return;
    if (isInitialLoading) return;

    const targetIndex = messages.findIndex((message) => message.id === scrollTarget.messageId);
    if (targetIndex >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({
          index: targetIndex,
          animated: false,
          viewPosition: 0.5,
        });
        onResolveRef.current(scrollTarget.highlightMessageId);
      });
      return;
    }

    if (canLoadOlder && !loadingOlder) {
      onLoadOlderRef.current();
      return;
    }

    if (!canLoadOlder && !loadingOlder) {
      onExhaustedRef.current();
    }
  }, [
    canLoadOlder,
    isInitialLoading,
    listRef,
    loadingOlder,
    messages,
    scrollTarget,
  ]);
}
