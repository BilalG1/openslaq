import { useState, useRef } from "react";
import type { CustomEmoji } from "@openslaq/shared";
import { uploadCustomEmoji, deleteCustomEmoji } from "@openslaq/client-core";
import { api as apiClient } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { Button, Input } from "../ui";
import { getErrorMessage } from "../../lib/errors";

interface CustomEmojiManagerProps {
  workspaceSlug: string;
}

export function CustomEmojiManager({ workspaceSlug }: CustomEmojiManagerProps) {
  const auth = useAuthProvider();
  const { state, dispatch } = useChatStore();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emojis = state.customEmojis;
  const filteredEmojis = search
    ? emojis.filter((e) => e.name.includes(search.toLowerCase()))
    : emojis;

  const handleUpload = async () => {
    if (!name || !file) return;
    setError(null);
    setUploading(true);
    try {
      const deps = { api: apiClient, auth, dispatch, getState: () => state };
      await uploadCustomEmoji(deps, { workspaceSlug, name: name.toLowerCase(), file });
      setName("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(getErrorMessage(err, "Failed to upload emoji"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (emoji: CustomEmoji) => {
    if (!confirm(`Delete :${emoji.name}:?`)) return;
    try {
      const deps = { api: apiClient, auth, dispatch, getState: () => state };
      await deleteCustomEmoji(deps, { workspaceSlug, emojiId: emoji.id });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete emoji"));
    }
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-primary m-0 mb-3">
        Custom Emoji ({emojis.length})
      </h2>

      <div className="bg-surface-secondary rounded-lg border border-border-default p-4 mb-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">Emoji name</label>
            <Input
              variant="compact"
              data-testid="emoji-name-input"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="party-parrot"
              maxLength={32}
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Image (max 512KB)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              data-testid="emoji-file-input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
              <span className="text-xs text-muted truncate max-w-[150px]">
                {file ? file.name : "No file chosen"}
              </span>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            data-testid="emoji-upload-btn"
            disabled={!name || !file || uploading || name.length < 2}
            onClick={() => void handleUpload()}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
        {error && <div className="text-danger-text text-xs mt-2">{error}</div>}
      </div>

      {emojis.length > 5 && (
        <div className="mb-3">
          <Input
            variant="compact"
            data-testid="emoji-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji..."
          />
        </div>
      )}

      {filteredEmojis.length > 0 ? (
        <div className="bg-surface-secondary rounded-lg border border-border-default">
          {filteredEmojis.map((emoji) => (
            <div
              key={emoji.id}
              data-testid={`emoji-row-${emoji.name}`}
              className="flex items-center px-4 py-2 border-b border-border-secondary gap-3 last:border-b-0"
            >
              <img
                src={emoji.url}
                alt={`:${emoji.name}:`}
                className="w-8 h-8 object-contain"
              />
              <span className="text-sm font-medium text-primary flex-1">
                :{emoji.name}:
              </span>
              <Button
                variant="secondary"
                size="sm"
                data-testid={`emoji-delete-${emoji.name}`}
                onClick={() => void handleDelete(emoji)}
                className="border-danger-border text-danger-text hover:bg-danger-bg"
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      ) : emojis.length > 0 ? (
        <div className="text-muted text-sm text-center py-4">No emoji matching &ldquo;{search}&rdquo;</div>
      ) : (
        <div className="text-muted text-sm text-center py-4">No custom emoji yet. Upload one above!</div>
      )}
    </div>
  );
}
