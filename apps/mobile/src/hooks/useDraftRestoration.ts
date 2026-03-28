import { useCallback, useEffect, useRef } from "react";
import { useDraftMessage } from "@/hooks/useDraftMessage";

interface EditorHandle {
  setContent(content: string): void;
  focus(position?: "end"): void;
}

interface UseDraftRestorationOptions {
  /** When set, draft restoration is disabled (editing takes priority). */
  editingMessage: { id: string; content: string } | null | undefined;
  /** AsyncStorage key for draft persistence. */
  draftKey: string | undefined;
  /** Ref to the editor (null until ready). */
  editorRef: React.RefObject<EditorHandle | null>;
}

export function useDraftRestoration({
  editingMessage,
  draftKey,
  editorRef,
}: UseDraftRestorationOptions) {
  const { draft, saveDraft, clearDraft, isLoaded: draftLoaded } = useDraftMessage(
    editingMessage ? undefined : draftKey,
  );
  const draftRestoredRef = useRef(false);
  const editorReadyRef = useRef(false);

  // Reset restoration flag when the draft key changes (e.g. channel switch without remount)
  const prevKeyRef = useRef(draftKey);
  if (prevKeyRef.current !== draftKey) {
    prevKeyRef.current = draftKey;
    draftRestoredRef.current = false;
  }

  /**
   * Called when the editor signals it's ready. Restores editing content or
   * a saved draft.
   */
  const handleEditorReady = useCallback(() => {
    editorReadyRef.current = true;

    if (editingMessage) {
      editorRef.current?.setContent(editingMessage.content);
      editorRef.current?.focus("end");
      return;
    }

    if (draftLoaded && draft && !draftRestoredRef.current) {
      draftRestoredRef.current = true;
      editorRef.current?.setContent(draft);
    }
  }, [draftLoaded, draft, editingMessage, editorRef]);

  // Restore draft when it loads after editor is already ready
  useEffect(() => {
    if (draftLoaded && draft && !draftRestoredRef.current && editorReadyRef.current) {
      draftRestoredRef.current = true;
      editorRef.current?.setContent(draft);
    }
  }, [draftLoaded, draft, editorRef]);

  // Load editing message content when it changes
  useEffect(() => {
    if (editingMessage && editorReadyRef.current) {
      editorRef.current?.setContent(editingMessage.content);
      editorRef.current?.focus("end");
    }
  }, [editingMessage, editorRef]);

  return {
    saveDraft,
    clearDraft,
    handleEditorReady,
  };
}
