import { useCallback, useEffect, useMemo, useRef } from "react";
import { upsertDraftOp, deleteDraftByKeyOp, fetchDraftForChannel } from "@openslaq/client-core";
import { useChatStore } from "../state/chat-store";
import { useAuthProvider } from "../lib/api-client";
import { api } from "../api";

const PREFIX = "openslaq-draft-";
const LOCAL_DEBOUNCE_MS = 300;
const SERVER_DEBOUNCE_MS = 2000;

interface DraftData {
  content: string;
  updatedAt: number;
}

function readDraft(key: string): string | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    // Try new JSON format
    try {
      const parsed = JSON.parse(raw) as DraftData;
      if (typeof parsed.content === "string") return parsed.content;
    } catch {
      // Legacy plain string format
    }
    return raw;
  } catch {
    return null;
  }
}

function readDraftWithTime(key: string): DraftData | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as DraftData;
      if (typeof parsed.content === "string") return parsed;
    } catch {
      // Legacy plain string — treat as old
    }
    return { content: raw, updatedAt: 0 };
  } catch {
    return null;
  }
}

function writeDraft(key: string, value: string) {
  try {
    if (value) {
      const data: DraftData = { content: value, updatedAt: Date.now() };
      localStorage.setItem(PREFIX + key, JSON.stringify(data));
    } else {
      localStorage.removeItem(PREFIX + key);
    }
  } catch {
    // quota exceeded — silently ignore
  }
}

function removeDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

interface UseDraftMessageOptions {
  workspaceSlug?: string;
  channelId?: string;
  parentMessageId?: string;
}

export function useDraftMessage(
  draftKey: string | undefined,
  options?: UseDraftMessageOptions,
) {
  const { state, dispatch } = useChatStore();
  const auth = useAuthProvider();
  const deps = { api, auth, dispatch, getState: () => state };

  const localDraft = useMemo(() => (draftKey ? readDraft(draftKey) : null), [draftKey]);
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverDraftRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const draftRef = useRef<string | null>(localDraft);

  // On mount: fetch server draft and prefer the newer one
  useEffect(() => {
    if (initializedRef.current) return;
    const { workspaceSlug, channelId, parentMessageId } = options ?? {};
    if (!workspaceSlug || !channelId || !draftKey) return;
    initializedRef.current = true;

    void (async () => {
      try {
        const serverDraft = await fetchDraftForChannel(deps, {
          workspaceSlug,
          channelId,
          parentMessageId,
        });
        if (!serverDraft) return;

        const local = readDraftWithTime(draftKey);
        const serverTime = new Date(serverDraft.updatedAt).getTime();

        if (!local || serverTime > local.updatedAt) {
          // Server is newer — update localStorage
          writeDraft(draftKey, serverDraft.content);
          serverDraftRef.current = serverDraft.content;
          draftRef.current = serverDraft.content;
        }
      } catch {
        // ignore — use local draft
      }
    })();

    return () => {
      initializedRef.current = false;
    };
  }, [draftKey, options?.workspaceSlug, options?.channelId, options?.parentMessageId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
      if (serverTimerRef.current) clearTimeout(serverTimerRef.current);
    };
  }, []);

  const saveDraft = useCallback(
    (markdown: string) => {
      if (!draftKey) return;
      const trimmed = markdown.trim();

      // Local save at 300ms debounce
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
      localTimerRef.current = setTimeout(() => {
        writeDraft(draftKey, trimmed);
      }, LOCAL_DEBOUNCE_MS);

      // Server save at 2s debounce
      const { workspaceSlug, channelId, parentMessageId } = options ?? {};
      if (workspaceSlug && channelId && trimmed) {
        if (serverTimerRef.current) clearTimeout(serverTimerRef.current);
        serverTimerRef.current = setTimeout(() => {
          void upsertDraftOp(deps, {
            workspaceSlug,
            channelId,
            content: trimmed,
            parentMessageId,
          }).catch(() => {});
        }, SERVER_DEBOUNCE_MS);
      }
    },
    [draftKey, options?.workspaceSlug, options?.channelId, options?.parentMessageId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const clearDraft = useCallback(() => {
    if (!draftKey) return;
    if (localTimerRef.current) clearTimeout(localTimerRef.current);
    if (serverTimerRef.current) clearTimeout(serverTimerRef.current);
    removeDraft(draftKey);

    // Also delete on server
    const { workspaceSlug, channelId, parentMessageId } = options ?? {};
    if (workspaceSlug && channelId) {
      void deleteDraftByKeyOp(deps, {
        workspaceSlug,
        channelId,
        parentMessageId,
      }).catch(() => {});
    }
  }, [draftKey, options?.workspaceSlug, options?.channelId, options?.parentMessageId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Return server draft if it was newer, otherwise local
  const draft = serverDraftRef.current ?? localDraft;

  return { draft, saveDraft, clearDraft };
}
