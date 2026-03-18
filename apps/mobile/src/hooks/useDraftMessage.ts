import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "openslaq-draft-";
const DEBOUNCE_MS = 300;

export function useDraftMessage(draftKey: string | undefined) {
  const [draft, setDraft] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const pendingKeyRef = useRef<string | undefined>(undefined);
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
      const unmountKey = pendingKeyRef.current ?? keyRef.current;
      if (pendingValueRef.current !== null && unmountKey) {
        const trimmed = pendingValueRef.current.trim();
        if (trimmed) {
          void AsyncStorage.setItem(PREFIX + unmountKey, trimmed);
        } else {
          void AsyncStorage.removeItem(PREFIX + unmountKey);
        }
        pendingValueRef.current = null;
        pendingKeyRef.current = undefined;
      }
    };
  }, []);

  const saveDraft = useCallback(
    (text: string) => {
      const key = keyRef.current;  // capture at call time
      if (!key) return;
      pendingValueRef.current = text;
      pendingKeyRef.current = key;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const k = pendingKeyRef.current;
        const value = pendingValueRef.current;
        pendingValueRef.current = null;
        pendingKeyRef.current = undefined;
        if (!k) return;
        const trimmed = (value ?? "").trim();
        if (trimmed) {
          void AsyncStorage.setItem(PREFIX + k, trimmed);
        } else {
          void AsyncStorage.removeItem(PREFIX + k);
        }
      }, DEBOUNCE_MS);
    },
    [],
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
