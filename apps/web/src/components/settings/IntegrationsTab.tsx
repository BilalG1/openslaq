import type { MarketplaceListing, WorkspaceFeatureFlags } from "@openslaq/shared";
import { Avatar, Badge, Button } from "../ui";

const SLUG_TO_FLAG: Record<string, keyof WorkspaceFeatureFlags> = {
  "github-bot": "integrationGithub",
  "linear-bot": "integrationLinear",
  "sentry-bot": "integrationSentry",
  "vercel-bot": "integrationVercel",
};

interface IntegrationsTabProps {
  listings: MarketplaceListing[];
  installedIds: Set<string>;
  installing: boolean;
  onInstall: (listingId: string) => void;
  onUninstall: (listingId: string) => void;
  featureFlags: WorkspaceFeatureFlags;
}

export function IntegrationsTab({
  listings,
  installedIds,
  installing,
  onInstall,
  onUninstall,
  featureFlags,
}: IntegrationsTabProps) {
  const visibleListings = listings.filter((listing) => {
    const flagKey = SLUG_TO_FLAG[listing.slug];
    if (!flagKey) return true;
    return featureFlags[flagKey];
  });

  return (
    <div>
      {/* Available Integrations */}
      <h3 className="text-sm font-semibold text-primary m-0 mb-3">
        Available Integrations ({visibleListings.length})
      </h3>
      {visibleListings.length === 0 ? (
        <p className="text-sm text-muted">No integrations available. Contact a platform admin to enable integrations for this workspace.</p>
      ) : (
        <div className="bg-surface rounded-lg border border-border-default">
          {visibleListings.map((listing) => {
            const isInstalled = installedIds.has(listing.id);
            return (
              <div
                key={listing.id}
                className="flex items-center px-4 py-3 border-b border-border-secondary gap-3 last:border-b-0"
              >
                <Avatar
                  src={listing.avatarUrl}
                  fallback={listing.name.charAt(0)}
                  size="md"
                  shape="rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary truncate">
                      {listing.name}
                    </span>
                    {listing.category && (
                      <Badge variant="gray" size="sm">
                        {listing.category}
                      </Badge>
                    )}
                    {isInstalled && (
                      <Badge variant="blue" size="sm">
                        Installed
                      </Badge>
                    )}
                  </div>
                  {listing.description && (
                    <div className="text-xs text-muted truncate">
                      {listing.description}
                    </div>
                  )}
                </div>
                {isInstalled ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={installing}
                    onClick={() => onUninstall(listing.id)}
                  >
                    Uninstall
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={installing}
                    onClick={() => onInstall(listing.id)}
                  >
                    Install
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
