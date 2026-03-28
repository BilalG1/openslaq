import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, Input, Button } from "../ui";

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialText: string;
  initialUrl: string;
  showRemove: boolean;
  onSubmit: (text: string, url: string) => void;
  onRemove: () => void;
}

export function LinkDialog({
  open,
  onOpenChange,
  initialText,
  initialUrl,
  showRemove,
  onSubmit,
  onRemove,
}: LinkDialogProps) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);
  const [prevOpen, setPrevOpen] = useState(false);

  if (open && !prevOpen) {
    setText(initialText);
    setUrl(initialUrl);
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(text, url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          <DialogTitle>{showRemove ? "Edit link" : "Add link"}</DialogTitle>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-secondary">Display text</span>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Link text"
              data-testid="link-dialog-text"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-secondary">URL</span>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              data-testid="link-dialog-url"
              autoFocus
            />
          </label>
          <div className="flex items-center gap-2 justify-end">
            {showRemove && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={onRemove}
                data-testid="link-dialog-remove"
              >
                Remove link
              </Button>
            )}
            <div className="flex-1" />
            <Button type="submit" size="sm" disabled={!url.trim()} data-testid="link-dialog-save">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
