import type { Editor } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { Link, List } from "lucide-react";
import { Button, Tooltip } from "../ui";
import { EmojiPicker } from "./EmojiPicker";
import { LinkDialog } from "./LinkDialog";

interface EditorToolbarProps {
  editor: Editor;
  onSend: () => void;
  disabled?: boolean;
  onFileSelect?: () => void;
  uploading?: boolean;
}

function ToolbarDivider() {
  return (
    <div className="w-px h-5 bg-border-strong mx-1 self-center" />
  );
}

export function EditorToolbar({ editor, onSend, disabled, onFileSelect, uploading }: EditorToolbarProps) {
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
        // Select the just-inserted text so we can apply the link
        const newFrom = editor.state.selection.to - text.length;
        const newTo = editor.state.selection.to;
        editor
          .chain()
          .setTextSelection({ from: newFrom, to: newTo })
          .setLink({ href: url })
          .run();
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
        editor.chain().focus().run();
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
    {
      label: "B",
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      style: { fontWeight: 700 },
      tooltip: "Bold (\u2318B)",
    },
    {
      label: "I",
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      style: { fontStyle: "italic" },
      tooltip: "Italic (\u2318I)",
    },
    {
      label: "S",
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive("strike"),
      style: { textDecoration: "line-through" },
      tooltip: "Strikethrough (\u2318\u21E7X)",
    },
  ];

  const codeButtons: ButtonDef[] = [
    { label: "<>", action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), tooltip: "Inline code (\u2318E)" },
    { label: "{ }", action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock"), tooltip: "Code block" },
  ];

  const blockButtons: ButtonDef[] = [
    { label: ">", action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), tooltip: "Blockquote" },
    { label: <List size={14} />, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), tooltip: "Bullet list" },
    { label: "1.", action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), tooltip: "Ordered list" },
  ];

  const linkButtons: ButtonDef[] = [
    { label: <Link size={14} />, action: openLinkDialog, active: editor.isActive("link"), tooltip: "Link" },
  ];

  const groups = [inlineButtons, codeButtons, blockButtons, linkButtons];

  const renderButton = (btn: ButtonDef, idx: number) => (
    <Tooltip key={idx} content={btn.tooltip}>
      <button
        type="button"
        className={`editor-toolbar-btn${btn.active ? " active" : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          btn.action();
        }}
        style={btn.style}
      >
        {btn.label}
      </button>
    </Tooltip>
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
      <Tooltip content="Emoji">
        <button
          ref={emojiButtonRef}
          type="button"
          className={`editor-toolbar-btn${emojiPickerOpen ? " active" : ""}`}
          data-testid="emoji-toolbar-button"
          onMouseDown={(e) => {
            e.preventDefault();
            setEmojiPickerOpen((prev) => !prev);
          }}
        >
          ☺
        </button>
      </Tooltip>
      {emojiPickerOpen && (
        <EmojiPicker
          anchorRef={emojiButtonRef}
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
          <Tooltip content="Attach file">
            <button
              type="button"
              className="editor-toolbar-btn"
              onClick={onFileSelect}
              disabled={uploading}
              aria-label="Attach file"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 5.5l-6.5 6.5a3.5 3.5 0 1 1-5-5L9 .5a2 2 0 0 1 3 0 2 2 0 0 1 0 3L5.5 10a.5.5 0 0 1-.7-.7L11 3.1l-.7-.7L4 8.6a1.5 1.5 0 0 0 2.1 2.1L12.5 4a3 3 0 0 0 0-4.2 3 3 0 0 0-4.2 0L1.8 6.3a4.5 4.5 0 0 0 6.4 6.4L14.7 6.2 14 5.5z" />
              </svg>
            </button>
          </Tooltip>
        )}
        <Tooltip content="Send message">
          <Button
            variant="primary"
            size="icon"
            disabled={disabled || uploading}
            onClick={onSend}
            aria-label="Send message"
            className="editor-send-btn"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1 8L14 1L11 8L14 15L1 8Z" fill="white" />
              <path d="M11 8H1" stroke="white" strokeWidth="1.5" />
            </svg>
          </Button>
        </Tooltip>
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
