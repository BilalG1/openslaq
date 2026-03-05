import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { MentionWithMarkdown } from "@openslaq/editor";
import Placeholder from "@tiptap/extension-placeholder";
import { CodeBlockShiki } from "tiptap-extension-code-block-shiki";
import { Markdown } from "tiptap-markdown";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import { getMarkdown } from "@openslaq/editor";
import { EditorToolbar } from "./EditorToolbar";
import { createMentionSuggestion, type MentionSuggestionItem } from "./useMentionSuggestion";
import "./rich-text-editor.css";

interface RichTextEditorProps {
  onSubmit: (markdown: string) => void;
  placeholder?: string;
  onFileSelect?: () => void;
  uploading?: boolean;
  onFilePaste?: (files: File[]) => void;
  hasAttachments?: boolean;
  initialContent?: string | null;
  onContentChange?: (markdown: string) => void;
  filePreview?: React.ReactNode;
  members?: MentionSuggestionItem[];
}

// VS Code language IDs that differ from Shiki's bundled language names
const VSCODE_LANG_MAP: Record<string, string> = {
  typescriptreact: "tsx",
  javascriptreact: "jsx",
};

export function RichTextEditor({
  onSubmit,
  placeholder = "Type a message...",
  onFileSelect,
  uploading,
  onFilePaste,
  hasAttachments,
  initialContent,
  onContentChange,
  filePreview,
  members = [],
}: RichTextEditorProps) {
  const [focused, setFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [, setTxCount] = useState(0);

  // Keep members ref stable for the suggestion plugin
  const membersRef = useRef(members);
  membersRef.current = members;

  const mentionSuggestionActiveRef = useRef(false);
  const mentionSuggestion = useMemo(
    () => createMentionSuggestion(() => membersRef.current, mentionSuggestionActiveRef),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false }),
      CodeBlockShiki.configure({
        themes: { light: "light-plus", dark: "dark-plus" },
      }),
      Link.configure({ autolink: true, openOnClick: false }),
      MentionWithMarkdown.configure({
        HTMLAttributes: { class: "mention" },
        renderText({ node }) {
          return `<@${node.attrs.id}>`;
        },
        suggestion: mentionSuggestion,
      }),
      Placeholder.configure({ placeholder }),
      Markdown,
    ],
    autofocus: true,
    onFocus() {
      setFocused(true);
    },
    onBlur() {
      setFocused(false);
    },
    onTransaction() {
      setTxCount((c) => c + 1);
    },
    onUpdate({ editor: e }) {
      setIsEmpty(e.isEmpty);
      onContentChange?.(getMarkdown(e.storage));
    },
    editorProps: {
      handleKeyDown(_view, event) {
        if (!editor) return false;
        // Let the mention suggestion plugin handle keys when it's active
        if (mentionSuggestionActiveRef.current) return false;
        if (event.key === "Enter" && !event.shiftKey) {
          if (editor.isActive("codeBlock") || editor.isActive("bulletList") || editor.isActive("orderedList")) {
            return false;
          }
          event.preventDefault();
          handleSend();
          return true;
        }
        return false;
      },
      handlePaste(_view, event) {
        // Handle file pastes
        const items = event.clipboardData?.items;
        if (items && onFilePaste) {
          const files: File[] = [];
          for (const item of items) {
            if (item.kind === "file") {
              const file = item.getAsFile();
              if (file) files.push(file);
            }
          }
          if (files.length > 0) {
            onFilePaste(files);
            return true;
          }
        }
        // Handle VS Code paste — normalize language IDs before the
        // extension's handler runs (editorProps runs before plugins)
        if (event.clipboardData && editor && !editor.isActive("codeBlock")) {
          const text = event.clipboardData.getData("text/plain");
          const vsData = event.clipboardData.getData("vscode-editor-data");
          if (text && vsData) {
            try {
              const mode = (JSON.parse(vsData) as { mode?: string }).mode;
              if (mode) {
                const language = VSCODE_LANG_MAP[mode] ?? mode;
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "codeBlock",
                    attrs: { language },
                    content: [{ type: "text", text: text.replace(/\r\n?/g, "\n") }],
                  })
                  .run();
                return true;
              }
            } catch {
              // Invalid JSON, fall through
            }
          }
        }
        return false;
      },
    },
  });

  // Restore draft content once editor is ready (component remounts per channel via `key`)
  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
      editor.commands.focus("end");
      setIsEmpty(editor.isEmpty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const handleSend = useCallback(() => {
    if (!editor) return;
    const md = getMarkdown(editor.storage);
    if (md.trim() || hasAttachments) {
      onSubmit(md.trim());
      editor.commands.clearContent();
    }
  }, [editor, onSubmit, hasAttachments]);

  if (!editor) return null;

  return (
    <div
      className={clsx(
        "rounded-lg overflow-hidden transition-[border-color,box-shadow] duration-150",
        focused
          ? "border border-slaq-blue shadow-[0_0_0_1px_#1264a3]"
          : "border border-border-input",
      )}
    >
      <EditorContent editor={editor} />
      {filePreview}
      <EditorToolbar
        editor={editor}
        onSend={handleSend}
        disabled={isEmpty && !hasAttachments}
        onFileSelect={onFileSelect}
        uploading={uploading}
      />
    </div>
  );
}
