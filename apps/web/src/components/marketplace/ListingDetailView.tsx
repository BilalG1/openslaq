import type { MarketplaceListing } from "@openslaq/shared";
import { Avatar, Badge, Button } from "../ui";

interface ListingDetailViewProps {
  listing: MarketplaceListing;
  installed: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onBack: () => void;
  installing: boolean;
}

export function ListingDetailView({
  listing,
  installed,
  onInstall,
  onUninstall,
  onBack,
  installing,
}: ListingDetailViewProps) {
  return (
    <div data-testid="listing-detail">
      <button
        onClick={onBack}
        className="mb-4 text-sm text-slaq-blue hover:underline"
      >
        &larr; Back to marketplace
      </button>

      <div className="flex items-start gap-4">
        <Avatar
          src={listing.avatarUrl}
          fallback={listing.name.charAt(0)}
          size="lg"
        />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-primary">{listing.name}</h2>
            {listing.category && <Badge variant="gray">{listing.category}</Badge>}
            {installed && <Badge variant="blue">Installed</Badge>}
          </div>
          {listing.description && (
            <p className="mt-1 text-muted">{listing.description}</p>
          )}
        </div>
        <div>
          {installed ? (
            <Button
              variant="danger"
              onClick={onUninstall}
              disabled={installing}
              data-testid="uninstall-button"
            >
              Uninstall
            </Button>
          ) : (
            <Button
              onClick={onInstall}
              disabled={installing}
              data-testid="install-button"
            >
              {installing ? "Installing..." : "Install to Workspace"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {listing.longDescription && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-2 font-semibold text-primary">About</h3>
            <div className="prose prose-sm text-muted whitespace-pre-wrap">
              {listing.longDescription}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 font-semibold text-primary">Permissions</h3>
          <div className="flex flex-wrap gap-1">
            {listing.requestedScopes.map((scope) => (
              <Badge key={scope} variant="blue">
                {scope}
              </Badge>
            ))}
          </div>
        </div>

        {listing.requestedEvents.length > 0 && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-2 font-semibold text-primary">Events</h3>
            <div className="flex flex-wrap gap-1">
              {listing.requestedEvents.map((event) => (
                <Badge key={event} variant="gray">
                  {event}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
