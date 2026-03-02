import { useCallback, useEffect, useMemo, useRef } from "react";

const PREFIX = "openslaq-draft-";
const DEBOUNCE_MS = 300;

function readDraft(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function writeDraft(key: string, value: string) {
  try {
    if (value) {
      localStorage.setItem(PREFIX + key, value);
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

export function useDraftMessage(draftKey: string | undefined) {
  const draft = useMemo(() => (draftKey ? readDraft(draftKey) : null), [draftKey]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const saveDraft = useCallback(
    (markdown: string) => {
      if (!draftKey) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        writeDraft(draftKey, markdown.trim());
      }, DEBOUNCE_MS);
    },
    [draftKey],
  );

  const clearDraft = useCallback(() => {
    if (!draftKey) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    removeDraft(draftKey);
  }, [draftKey]);

  return { draft, saveDraft, clearDraft };
}
