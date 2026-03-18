import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, Button, Input } from "../ui";

interface AddBookmarkDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (url: string, title: string) => void;
}

export function AddBookmarkDialog({ open, onClose, onAdd }: AddBookmarkDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    const trimmedTitle = title.trim() || trimmedUrl;
    onAdd(trimmedUrl, trimmedTitle);
    setUrl("");
    setTitle("");
    onClose();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setUrl("");
      setTitle("");
      onClose();
    }
  }

  const isValid = url.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm" className="p-4">
        <DialogTitle className="mb-3">Add bookmark</DialogTitle>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="bookmark-url" className="block text-sm font-medium text-secondary mb-1">
              URL
            </label>
            <Input
              id="bookmark-url"
              data-testid="bookmark-url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              autoFocus
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="bookmark-title" className="block text-sm font-medium text-secondary mb-1">
              Title
            </label>
            <Input
              id="bookmark-title"
              data-testid="bookmark-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Display title (defaults to URL)"
              maxLength={200}
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <Button variant="secondary" size="sm" type="button" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              data-testid="bookmark-add-button"
              variant="primary"
              size="sm"
              type="submit"
              disabled={!isValid}
            >
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
