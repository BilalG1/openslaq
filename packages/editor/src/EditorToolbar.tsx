import type { Editor } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { EmojiPicker, type CustomEmojiItem } from "./EmojiPicker";
import { LinkDialog } from "./LinkDialog";

interface EditorToolbarProps {
  editor: Editor;
  onSend: () => void;
  disabled?: boolean;
  onFileSelect?: () => void;
  uploading?: boolean;
  onScheduleSend?: () => void;
  customEmojis?: CustomEmojiItem[];
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border-strong mx-1 self-center" />;
}

export function EditorToolbar({ editor, onSend, disabled, onFileSelect, uploading, onScheduleSend, customEmojis }: EditorToolbarProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkInitialText, setLinkInitialText] = useState("");
  const [linkInitialUrl, setLinkInitialUrl] = useState("");
  const [linkIsEdit, setLinkIsEdit] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const openLinkDialog = useCallback(() => {
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
    setLinkDialogOpen(false);
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  }, [editor]);

  const handleLinkDialogOpenChange = useCallback(
    (open: boolean) => {
      setLinkDialogOpen(open);
      if (!open) {
        // Restore focus immediately so typing after close works without delay,
        // then re-assert once the close state has flushed.
        editor.commands.focus("end");
        setTimeout(() => {
          editor.commands.focus("end");
        }, 0);
      }
    },
    [editor],
  );

  type ButtonDef = {
    label: React.ReactNode;
    action: () => void;
    active: boolean;
    style?: React.CSSProperties;
    tooltip: string;
  };

  const inlineButtons: ButtonDef[] = [
    { label: "B", action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), style: { fontWeight: 700 }, tooltip: "Bold (⌘B)" },
    { label: "I", action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), style: { fontStyle: "italic" }, tooltip: "Italic (⌘I)" },
    { label: "S", action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), style: { textDecoration: "line-through" }, tooltip: "Strikethrough (⌘⇧X)" },
  ];

  const codeButtons: ButtonDef[] = [
    { label: "<>", action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), tooltip: "Inline code (⌘E)" },
    { label: "{ }", action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock"), tooltip: "Code block" },
  ];

  const blockButtons: ButtonDef[] = [
    { label: ">", action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), tooltip: "Blockquote" },
    { label: "•", action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), tooltip: "Bullet list" },
    { label: "1.", action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), tooltip: "Ordered list" },
  ];

  const linkButtons: ButtonDef[] = [{ label: "🔗", action: openLinkDialog, active: editor.isActive("link"), tooltip: "Link" }];

  const groups = [inlineButtons, codeButtons, blockButtons, linkButtons];

  const renderButton = (btn: ButtonDef, idx: number) => (
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

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-t border-border-default bg-surface-secondary">
      {groups.map((group, gi) => (
        <div key={gi} className="contents">
          {gi > 0 && <ToolbarDivider />}
          {group.map(renderButton)}
        </div>
      ))}

      <ToolbarDivider />
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

      <div className="ml-auto flex items-center gap-1">
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
        <div className="inline-flex items-center">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={onSend}
            aria-label="Send message"
            title="Send message"
            className={`editor-send-btn h-8 inline-flex items-center justify-center bg-slaq-blue text-white disabled:opacity-50 ${onScheduleSend ? "w-7 rounded-l" : "w-8 rounded"}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1 8L14 1L11 8L14 15L1 8Z" fill="white" />
              <path d="M11 8H1" stroke="white" strokeWidth="1.5" />
            </svg>
          </button>
          {onScheduleSend && (
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={onScheduleSend}
              aria-label="Schedule message"
              title="Schedule for later"
              data-testid="schedule-send-button"
              className="editor-send-btn h-8 w-5 inline-flex items-center justify-center rounded-r bg-slaq-blue text-white disabled:opacity-50 border-l border-white/20"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="white">
                <path d="M1 3L4 6L7 3" />
              </svg>
            </button>
          )}
        </div>
      </div>

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
