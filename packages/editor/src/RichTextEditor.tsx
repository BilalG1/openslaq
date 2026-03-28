import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { MentionWithMarkdown } from "./MentionMarkdown";
import Placeholder from "@tiptap/extension-placeholder";
import { CodeBlockShiki } from "tiptap-extension-code-block-shiki";
import { Markdown } from "tiptap-markdown";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import { Link as LinkIcon } from "lucide-react";
import { EmojiPicker, type CustomEmojiItem } from "./EmojiPicker";
import { LinkDialog } from "./LinkDialog";
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

// ── Inline toolbar sub-components ──────────────────────────────────────

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border-default/50 mx-1 self-center" />;
}

type ButtonDef = {
  label: React.ReactNode;
  action: () => void;
  active: boolean;
  style?: React.CSSProperties;
  tooltip: string;
};

function renderButton(btn: ButtonDef, idx: number) {
  return (
    <button
      key={idx}
      type="button"
      title={btn.tooltip}
      className={`editor-toolbar-btn${btn.active ? " active" : ""}`}
      onMouseDown={(e) => {
        e.preventDefault();
        btn.action();
      }}
      style={btn.style}
    >
      {btn.label}
    </button>
  );
}

// ── Top formatting bar (slides in on focus) ─────────────────────────────

interface FormattingBarProps {
  editor: Editor;
  onOpenLinkDialog: () => void;
}

function FormattingBar({ editor, onOpenLinkDialog }: FormattingBarProps) {
  const inlineButtons: ButtonDef[] = [
    { label: "B", action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), style: { fontWeight: 700 }, tooltip: "Bold (⌘B)" },
    { label: "I", action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), style: { fontStyle: "italic" }, tooltip: "Italic (⌘I)" },
    { label: "S", action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), style: { textDecoration: "line-through" }, tooltip: "Strikethrough (⌘⇧X)" },
  ];

  const linkButtons: ButtonDef[] = [
    { label: <LinkIcon size={16} />, action: onOpenLinkDialog, active: editor.isActive("link"), tooltip: "Link" },
  ];

  const listButtons: ButtonDef[] = [
    { label: "•", action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), tooltip: "Bullet list" },
    { label: "1.", action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), tooltip: "Ordered list" },
  ];

  const blockquoteButtons: ButtonDef[] = [
    { label: ">", action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), tooltip: "Blockquote" },
  ];

  const codeButtons: ButtonDef[] = [
    { label: "<>", action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), tooltip: "Inline code (⌘E)" },
    { label: "{ }", action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock"), tooltip: "Code block" },
  ];

  const groups = [inlineButtons, linkButtons, listButtons, blockquoteButtons, codeButtons];

  return (
    <div className="formatting-bar flex items-center gap-0.5 px-2 py-1">
      {groups.map((group, gi) => (
        <div key={gi} className="contents">
          {gi > 0 && <ToolbarDivider />}
          {group.map(renderButton)}
        </div>
      ))}
    </div>
  );
}

// ── Bottom action bar ──────────────────────────────────────────────────

interface ActionBarProps {
  editor: Editor;
  onSend: () => void;
  disabled?: boolean;
  onFileSelect?: () => void;
  uploading?: boolean;
  onScheduleSend?: () => void;
  customEmojis?: CustomEmojiItem[];
  onOpenLinkDialog: () => void;
}

function ActionBar({ editor, onSend, disabled, onFileSelect, uploading, onScheduleSend, customEmojis }: ActionBarProps) {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex items-center gap-0.5 px-2 py-1">
      {/* Left side: action icons */}
      {onFileSelect && (
        <button
          type="button"
          className="editor-toolbar-btn"
          onClick={onFileSelect}
          disabled={uploading}
          aria-label="Attach file"
          title="Attach file"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 5.5l-6.5 6.5a3.5 3.5 0 1 1-5-5L9 .5a2 2 0 0 1 3 0 2 2 0 0 1 0 3L5.5 10a.5.5 0 0 1-.7-.7L11 3.1l-.7-.7L4 8.6a1.5 1.5 0 0 0 2.1 2.1L12.5 4a3 3 0 0 0 0-4.2 3 3 0 0 0-4.2 0L1.8 6.3a4.5 4.5 0 0 0 6.4 6.4L14.7 6.2 14 5.5z" />
          </svg>
        </button>
      )}

      <button
        ref={emojiButtonRef}
        type="button"
        title="Emoji"
        className={`editor-toolbar-btn${emojiPickerOpen ? " active" : ""}`}
        data-testid="emoji-toolbar-button"
        onMouseDown={(e) => {
          e.preventDefault();
          setEmojiPickerOpen((prev) => !prev);
        }}
      >
        ☺
      </button>
      {emojiPickerOpen && (
        <EmojiPicker
          anchorRef={emojiButtonRef}
          customEmojis={customEmojis}
          onSelect={(emoji) => {
            editor.chain().focus().insertContent(emoji).run();
            setEmojiPickerOpen(false);
          }}
          onClose={() => {
            setEmojiPickerOpen(false);
            editor.chain().focus().run();
          }}
        />
      )}

      <button
        type="button"
        title="Mention someone"
        className="editor-toolbar-btn"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.chain().focus().insertContent("@").run();
        }}
      >
        @
      </button>

      {/* Right side: combined send + schedule split button */}
      <div className="ml-auto flex items-center">
        <div className={`editor-send-group${disabled || uploading ? " disabled" : ""}`}>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={onSend}
            aria-label="Send message"
            title="Send message"
            className="editor-send-btn"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M1 8L14 1L11 8L14 15L1 8Z" fill="white" />
              <path d="M11 8H1" stroke="white" strokeWidth="1.5" />
            </svg>
          </button>
          {onScheduleSend && (
            <>
              <div className="editor-send-divider" />
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={onScheduleSend}
                aria-label="Schedule message"
                title="Schedule for later"
                data-testid="schedule-send-button"
                className="editor-send-chevron"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

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

  // Link dialog state (shared between top bar and bottom bar)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkInitialText, setLinkInitialText] = useState("");
  const [linkInitialUrl, setLinkInitialUrl] = useState("");
  const [linkIsEdit, setLinkIsEdit] = useState(false);

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

  // Link dialog callbacks
  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, "");
    const existingHref = editor.getAttributes("link").href as string | undefined;

    setLinkInitialText(selectedText);
    setLinkInitialUrl(existingHref ?? "");
    setLinkIsEdit(!!existingHref);
    setLinkDialogOpen(true);
  }, [editor]);

  const handleLinkSubmit = useCallback(
    (text: string, url: string) => {
      if (!editor) return;
      setLinkDialogOpen(false);

      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, "");

      if (text && text !== selectedText) {
        editor.chain().focus().deleteSelection().insertContent(text).run();
        const newFrom = editor.state.selection.to - text.length;
        const newTo = editor.state.selection.to;
        editor.chain().setTextSelection({ from: newFrom, to: newTo }).setLink({ href: url }).run();
      } else {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      }
    },
    [editor],
  );

  const handleLinkRemove = useCallback(() => {
    if (!editor) return;
    setLinkDialogOpen(false);
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  }, [editor]);

  const handleLinkDialogOpenChange = useCallback(
    (open: boolean) => {
      setLinkDialogOpen(open);
      if (!open && editor) {
        editor.commands.focus("end");
        setTimeout(() => {
          editor.commands.focus("end");
        }, 0);
      }
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <div
      className={clsx(
        "rich-text-editor rounded-lg overflow-hidden transition-[border-color] duration-150",
        focused
          ? "is-focused border border-border-strong"
          : "border border-border-input",
      )}
    >
      {/* Top bar: formatting buttons (slides in on focus) */}
      <FormattingBar editor={editor} onOpenLinkDialog={openLinkDialog} />

      {/* Middle: text area */}
      <EditorContent editor={editor} />
      {filePreview}

      {/* Bottom bar: action icons (attach, emoji, @mention) + send */}
      <ActionBar
        editor={editor}
        onSend={handleSend}
        disabled={isEmpty && !hasAttachments}
        onFileSelect={onFileSelect}
        uploading={uploading}
        onScheduleSend={onScheduleSend}
        customEmojis={customEmojis}
        onOpenLinkDialog={openLinkDialog}
      />

      <LinkDialog
        open={linkDialogOpen}
        onOpenChange={handleLinkDialogOpenChange}
        initialText={linkInitialText}
        initialUrl={linkInitialUrl}
        showRemove={linkIsEdit}
        onSubmit={handleLinkSubmit}
        onRemove={handleLinkRemove}
      />
    </div>
  );
}

export type { MentionSuggestionItem };
