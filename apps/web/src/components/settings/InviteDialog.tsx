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
} from "../ui";
import { UserPlus, Copy, Check, RefreshCw } from "lucide-react";

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
      const res = await authorizedRequest(user, (headers) =>
        api.api.workspaces[":slug"].invites.$get(
          { param: { slug: workspaceSlug } },
          { headers },
        ),
      );
      const invites = (await res.json()) as Invite[];
      if (invites.length > 0) {
        setInvite(invites[invites.length - 1]!);
        setInviteCopied(false);
      } else {
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
      <DialogContent size="md" className="p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
            <UserPlus className="w-7 h-7 text-blue-500" />
          </div>

          <div>
            <DialogTitle className="text-lg">Invite People</DialogTitle>
            <p className="text-[13px] text-muted mt-1 m-0">
              Share this link to invite new members to this workspace.
            </p>
          </div>

          {error && <div className="text-danger-text text-sm">{error}</div>}

          {loading && !invite ? (
            <p className="text-sm text-muted">Loading invite link...</p>
          ) : inviteLink ? (
            <div className="flex flex-col gap-3 w-full">
              <code className="block w-full text-sm bg-surface-secondary rounded-lg p-3 text-left break-all select-all">
                {inviteLink}
              </code>

              <Button
                variant="primary"
                size="lg"
                onClick={handleCopyInvite}
                className={clsx(
                  "w-full gap-2",
                  inviteCopied && "bg-emerald-600 hover:bg-emerald-600/90",
                )}
              >
                {inviteCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Invite Link
                  </>
                )}
              </Button>

              {invite?.expiresAt && (
                <p className="text-xs text-muted m-0">
                  Expires{" "}
                  {new Date(invite.expiresAt).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleGenerateNew()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-muted hover:text-primary transition-colors disabled:opacity-50 bg-transparent border-0 cursor-pointer p-0"
              >
                <RefreshCw className={clsx("w-3 h-3", loading && "animate-spin")} />
                Generate new link
              </button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
