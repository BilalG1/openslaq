import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "openslaq-draft-";
const DEBOUNCE_MS = 300;

export function useDraftMessage(draftKey: string | undefined) {
  const [draft, setDraft] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const keyRef = useRef(draftKey);
  keyRef.current = draftKey;

  useEffect(() => {
    if (!draftKey) {
      setDraft(null);
      setIsLoaded(true);
      return;
    }
    let cancelled = false;
    void AsyncStorage.getItem(PREFIX + draftKey).then((value) => {
      if (cancelled) return;
      setDraft(value);
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (pendingValueRef.current !== null && keyRef.current) {
        const trimmed = pendingValueRef.current.trim();
        if (trimmed) {
          void AsyncStorage.setItem(PREFIX + keyRef.current, trimmed);
        } else {
          void AsyncStorage.removeItem(PREFIX + keyRef.current);
        }
        pendingValueRef.current = null;
      }
    };
  }, []);

  const saveDraft = useCallback(
    (text: string) => {
      if (!draftKey) return;
      pendingValueRef.current = text;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        pendingValueRef.current = null;
        const trimmed = text.trim();
        if (trimmed) {
          void AsyncStorage.setItem(PREFIX + draftKey, trimmed);
        } else {
          void AsyncStorage.removeItem(PREFIX + draftKey);
        }
      }, DEBOUNCE_MS);
    },
    [draftKey],
  );

  const clearDraft = useCallback(() => {
    if (!draftKey) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingValueRef.current = null;
    void AsyncStorage.removeItem(PREFIX + draftKey);
  }, [draftKey]);

  return { draft, saveDraft, clearDraft, isLoaded };
}
