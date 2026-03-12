import { useState } from "react";
import type { MarketplaceListing } from "@openslaq/shared";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui";

interface WorkspaceOption {
  slug: string;
  name: string;
}

interface InstallConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: MarketplaceListing;
  workspaces: WorkspaceOption[];
  onConfirm: (workspaceSlug: string) => Promise<void>;
}

export function InstallConsentDialog({
  open,
  onOpenChange,
  listing,
  workspaces,
  onConfirm,
}: InstallConsentDialogProps) {
  const [selectedSlug, setSelectedSlug] = useState(workspaces[0]?.slug ?? "");
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!selectedSlug) return;
    setInstalling(true);
    setError(null);
    try {
      await onConfirm(selectedSlug);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Installation failed");
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="install-consent-dialog">
        <DialogTitle>Install {listing.name}</DialogTitle>

        <div className="mt-4 space-y-4">
          {workspaces.length > 1 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-primary">
                Workspace
              </label>
              <Select value={selectedSlug} onValueChange={setSelectedSlug}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.slug} value={ws.slug}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <h4 className="mb-1 text-sm font-medium text-primary">
              Requested permissions
            </h4>
            <div className="flex flex-wrap gap-1">
              {listing.requestedScopes.map((scope) => (
                <Badge key={scope} variant="blue">
                  {scope}
                </Badge>
              ))}
            </div>
          </div>

          {listing.requestedEvents.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-medium text-primary">
                Event subscriptions
              </h4>
              <div className="flex flex-wrap gap-1">
                {listing.requestedEvents.map((event) => (
                  <Badge key={event} variant="gray">
                    {event}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500" data-testid="install-error">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={installing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={installing || !selectedSlug}
              data-testid="confirm-install-button"
            >
              {installing ? "Installing..." : "Authorize & Install"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
