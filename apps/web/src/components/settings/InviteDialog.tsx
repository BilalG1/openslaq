import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import clsx from "clsx";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import { AuthError, getErrorMessage } from "../../lib/errors";
import { redirectToAuth } from "../../lib/auth";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Input,
} from "../ui";

interface Invite {
  code: string;
  expiresAt: string | null;
}

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
}

export function InviteDialog({ open, onOpenChange, workspaceSlug }: InviteDialogProps) {
  const user = useCurrentUser();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInvite = useCallback(async () => {
    if (!user || !workspaceSlug) return;
    const res = await authorizedRequest(user, (headers) =>
      api.api.workspaces[":slug"].invites.$post(
        { param: { slug: workspaceSlug }, json: {} },
        { headers },
      ),
    );
    const data = (await res.json()) as Invite;
    setInvite(data);
    setInviteCopied(false);
  }, [user, workspaceSlug]);

  const loadOrCreateInvite = useCallback(async () => {
    if (!user || !workspaceSlug) return;
    setLoading(true);
    setError(null);
    try {
      // Try to fetch existing invites
      const res = await authorizedRequest(user, (headers) =>
        api.api.workspaces[":slug"].invites.$get(
          { param: { slug: workspaceSlug } },
          { headers },
        ),
      );
      const invites = (await res.json()) as Invite[];
      if (invites.length > 0) {
        // Use the most recent one (last in the list)
        setInvite(invites[invites.length - 1]!);
        setInviteCopied(false);
      } else {
        // No active invite — create one
        await createInvite();
      }
    } catch (err) {
      if (err instanceof AuthError) {
        redirectToAuth();
      } else {
        setError(getErrorMessage(err, "Failed to load invite link"));
      }
    } finally {
      setLoading(false);
    }
  }, [user, workspaceSlug, createInvite]);

  useEffect(() => {
    if (open) {
      void loadOrCreateInvite();
    } else {
      setInvite(null);
      setInviteCopied(false);
      setError(null);
    }
  }, [open, loadOrCreateInvite]);

  const handleGenerateNew = useCallback(async () => {
    if (!user || !workspaceSlug) return;
    setLoading(true);
    setError(null);
    try {
      await createInvite();
    } catch (err) {
      if (err instanceof AuthError) {
        redirectToAuth();
      } else {
        setError(getErrorMessage(err, "Failed to create invite link"));
      }
    } finally {
      setLoading(false);
    }
  }, [user, workspaceSlug, createInvite]);

  const handleCopyInvite = useCallback(() => {
    if (invite) {
      const link = `${window.location.origin}/invite/${invite.code}`;
      void navigator.clipboard.writeText(link);
      setInviteCopied(true);
    }
  }, [invite]);

  if (!user) return null;

  const inviteLink = invite ? `${window.location.origin}/invite/${invite.code}` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="p-6">
        <DialogTitle>Invite People</DialogTitle>

        <div className="flex flex-col gap-4 mt-4">
          <p className="text-[13px] text-muted m-0">
            Share this link to invite new members to this workspace.
          </p>

          {error && <div className="text-danger-text text-sm">{error}</div>}

          {loading && !invite ? (
            <p className="text-sm text-muted">Loading invite link...</p>
          ) : inviteLink ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 items-center bg-surface-secondary rounded-md p-3">
                <Input
                  variant="compact"
                  readOnly
                  value={inviteLink}
                  className="flex-1 text-sm min-w-0"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCopyInvite}
                  className={clsx(
                    "whitespace-nowrap",
                    inviteCopied && "bg-emerald-600 hover:bg-emerald-600/90",
                  )}
                >
                  {inviteCopied ? "Copied!" : "Copy Link"}
                </Button>
              </div>
              {invite?.expiresAt && (
                <p className="text-xs text-muted m-0">
                  This link expires on{" "}
                  {new Date(invite.expiresAt).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleGenerateNew()}
                disabled={loading}
                className="self-start"
              >
                Generate New Link
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
