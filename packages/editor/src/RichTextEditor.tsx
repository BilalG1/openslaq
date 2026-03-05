import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { MentionWithMarkdown } from "./MentionMarkdown";
import Placeholder from "@tiptap/extension-placeholder";
import { CodeBlockShiki } from "tiptap-extension-code-block-shiki";
import { Markdown } from "tiptap-markdown";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import { EditorToolbar } from "./EditorToolbar";
import type { CustomEmojiItem } from "./EmojiPicker";
import { createMentionSuggestion, type MentionSuggestionItem } from "./useMentionSuggestion";
import { SlashCommand } from "./SlashCommandExtension";
import { createSlashCommandSuggestion, type SlashCommandItem } from "./useSlashCommandSuggestion";
import { extractPastedFiles, getMarkdown, parseVsCodePaste, shouldSendOnEnter } from "./editor-helpers";
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
  onScheduleSend?: () => void;
  customEmojis?: CustomEmojiItem[];
  slashCommands?: SlashCommandItem[];
  onSlashCommand?: (command: string, args: string) => void;
}

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
  onScheduleSend,
  customEmojis,
  slashCommands = [],
  onSlashCommand,
}: RichTextEditorProps) {
  const [focused, setFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [, setTxCount] = useState(0);

  const membersRef = useRef(members);
  membersRef.current = members;

  const slashCommandsRef = useRef(slashCommands);
  slashCommandsRef.current = slashCommands;

  const onSlashCommandRef = useRef(onSlashCommand);
  onSlashCommandRef.current = onSlashCommand;

  const mentionSuggestionActiveRef = useRef(false);
  const mentionSuggestion = useMemo(
    () => createMentionSuggestion(() => membersRef.current, mentionSuggestionActiveRef),
    [],
  );

  const slashSuggestionActiveRef = useRef(false);
  const slashCommandSuggestion = useMemo(
    () => createSlashCommandSuggestion(() => slashCommandsRef.current, slashSuggestionActiveRef),
    [],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false }),
      CodeBlockShiki.configure({ themes: { light: "light-plus", dark: "dark-plus" } }),
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
      SlashCommand.configure({ suggestion: slashCommandSuggestion }),
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
    onUpdate({ editor: current }) {
      setIsEmpty(current.isEmpty);
      onContentChange?.(getMarkdown(current.storage));
    },
    editorProps: {
      handleKeyDown(_view, event) {
        if (!editor) return false;
        // Let suggestion plugins handle keys when active
        if (mentionSuggestionActiveRef.current) return false;
        if (slashSuggestionActiveRef.current) return false;

        const shouldSend = shouldSendOnEnter({
          key: event.key,
          shiftKey: event.shiftKey,
          isCodeBlock: editor.isActive("codeBlock"),
          isBulletList: editor.isActive("bulletList"),
          isOrderedList: editor.isActive("orderedList"),
        });

        if (!shouldSend) return false;
        event.preventDefault();
        handleSend();
        return true;
      },
      handlePaste(_view, event) {
        const pastedFiles = extractPastedFiles(event.clipboardData?.items);
        if (pastedFiles.length > 0 && onFilePaste) {
          onFilePaste(pastedFiles);
          return true;
        }

        if (!event.clipboardData || !editor || editor.isActive("codeBlock")) {
          return false;
        }

        const parsed = parseVsCodePaste({
          text: event.clipboardData.getData("text/plain"),
          vscodeEditorData: event.clipboardData.getData("vscode-editor-data"),
        });

        if (!parsed) return false;

        editor
          .chain()
          .focus()
          .insertContent({
            type: "codeBlock",
            attrs: { language: parsed.language },
            content: [{ type: "text", text: parsed.content }],
          })
          .run();

        return true;
      },
    },
  });

  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
      editor.commands.focus("end");
      setIsEmpty(editor.isEmpty);
    }
  }, [editor, initialContent]);

  const handleSend = useCallback(() => {
    if (!editor) return;
    const md = getMarkdown(editor.storage);
    const trimmed = md.trim();

    // Intercept slash commands
    if (trimmed.startsWith("/") && onSlashCommandRef.current) {
      const spaceIdx = trimmed.indexOf(" ");
      const command = spaceIdx === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIdx);
      const args = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();
      if (command) {
        onSlashCommandRef.current(command, args);
        editor.commands.clearContent();
        return;
      }
    }

    if (trimmed || hasAttachments) {
      onSubmit(trimmed);
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
        onScheduleSend={onScheduleSend}
        customEmojis={customEmojis}
      />
    </div>
  );
}

export type { MentionSuggestionItem };
