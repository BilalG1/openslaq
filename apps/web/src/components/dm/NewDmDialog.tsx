import { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useGalleryMode, useGalleryMockData } from "../../gallery/gallery-context";
import { useAsyncEffect } from "../../hooks/useAsyncEffect";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { AuthError, getErrorMessage } from "../../lib/errors";
import { redirectToAuth } from "../../lib/auth";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../ui";

interface Member {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

interface NewDmDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  onCreateGroupDm?: (memberIds: string[]) => void;
  workspaceSlug: string;
}

export function NewDmDialog({
  open,
  onClose,
  onSelectUser,
  onCreateGroupDm,
  workspaceSlug,
}: NewDmDialogProps) {
  const user = useCurrentUser();
  const isGallery = useGalleryMode();
  const galleryMockData = useGalleryMockData();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // Reset selection when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      setSearch("");
    }
  }, [open]);

  useAsyncEffect(
    async (signal) => {
      if (!open || !user || !workspaceSlug) return;

      setLoading(true);
      setError(null);
      try {
        if (isGallery) {
          const demoMembers = (galleryMockData?.members ?? []).map((member) => ({
            id: member.id,
            displayName: member.displayName,
            email: member.email,
            avatarUrl: member.avatarUrl,
          }));
          if (!signal.cancelled) {
            setMembers(demoMembers);
          }
          return;
        }

        const res = await authorizedRequest(user, (headers) =>
          api.api.workspaces[":slug"].members.$get({ param: { slug: workspaceSlug }, query: {} }, { headers }),
        );
        const data = (await res.json()) as Member[];
        if (!signal.cancelled) {
          setMembers(data);
        }
      } catch (err) {
        if (err instanceof AuthError) {
          redirectToAuth();
          return;
        }

        if (!signal.cancelled) {
          setError(getErrorMessage(err, "Failed to load members"));
        }
      } finally {
        if (!signal.cancelled) {
          setLoading(false);
        }
      }
    },
    [galleryMockData?.members, isGallery, open, user, workspaceSlug],
  );

  const toggleMember = useCallback((memberId: string) => {
    setSelectedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  }, []);

  const handleGo = useCallback(() => {
    if (selectedIds.length === 1) {
      onSelectUser(selectedIds[0]!);
      onClose();
    } else if (selectedIds.length >= 2 && onCreateGroupDm) {
      onCreateGroupDm(selectedIds);
      onClose();
    }
  }, [selectedIds, onSelectUser, onCreateGroupDm, onClose]);

  const filteredMembers = search.trim()
    ? members.filter(
        (m) =>
          m.displayName.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase()),
      )
    : members;

  const selectedMembers = members.filter((m) => selectedIds.includes(m.id));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent size="sm" className="max-h-[500px] overflow-hidden p-4 flex flex-col">
        <DialogTitle className="mb-3">New Direct Message</DialogTitle>

        {/* Selected chips */}
        {selectedMembers.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2" data-testid="selected-members">
            {selectedMembers.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slaq-blue/20 text-slaq-blue text-xs"
              >
                {m.displayName}
                <button
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className="text-slaq-blue hover:text-white bg-transparent border-none cursor-pointer text-xs leading-none p-0"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search input */}
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 mb-2 rounded border border-border-default bg-surface text-primary text-sm outline-none focus:border-slaq-blue"
          data-testid="dm-search-input"
        />

        {/* Member list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && <p className="text-faint text-sm">Loading members...</p>}
          {error && <p className="text-danger-text text-[13px]">{error}</p>}
          {!loading && !error && filteredMembers.map((member) => {
            const isSelected = selectedIds.includes(member.id);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(member.id)}
                className={`block w-full py-2 px-3 border-none cursor-pointer text-left text-sm rounded text-primary hover:bg-surface-hover ${
                  isSelected ? "bg-surface-hover" : "bg-transparent"
                }`}
                data-testid={`dm-member-${member.id}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-slaq-blue border-slaq-blue" : "border-border-default"
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <div className="font-medium">{member.displayName}</div>
                    <div className="text-xs text-faint">{member.email}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Go button */}
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handleGo}
            className="mt-3 w-full py-2 rounded bg-slaq-blue text-white font-medium text-sm border-none cursor-pointer hover:bg-slaq-blue/90"
            data-testid="dm-go-button"
          >
            {selectedIds.length === 1 ? "Go" : `Start Group DM (${selectedIds.length} people)`}
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
