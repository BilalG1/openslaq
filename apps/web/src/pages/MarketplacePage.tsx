import { useEffect, useState, useCallback } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { redirectToAuth } from "../lib/auth";
import { useMarketplaceApi } from "../hooks/api/useMarketplaceApi";
import { useWorkspacesApi } from "../hooks/api/useWorkspacesApi";
import type { MarketplaceListing } from "@openslaq/shared";
import type { WorkspaceListItem } from "@openslaq/client-core";
import { MarketplaceGrid } from "../components/marketplace/MarketplaceGrid";
import { ListingDetailView } from "../components/marketplace/ListingDetailView";
import { InstallConsentDialog } from "../components/marketplace/InstallConsentDialog";

export function MarketplacePage() {
  const user = useCurrentUser();

  useEffect(() => {
    if (!user) void redirectToAuth();
  }, [user]);

  const { listListings, install, uninstall } = useMarketplaceApi();
  const { listWorkspaces } = useWorkspacesApi();

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [consentListing, setConsentListing] = useState<MarketplaceListing | null>(null);
  const [installing, setInstalling] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [allListings, allWorkspaces] = await Promise.all([
        listListings(),
        listWorkspaces(),
      ]);
      setListings(allListings);
      setWorkspaces(allWorkspaces);
    } catch (err) {
      console.error("Failed to load marketplace data:", err);
    } finally {
      setLoading(false);
    }
  }, [listListings, listWorkspaces]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const adminWorkspaces = workspaces.filter(
    (ws) => ws.role === "admin" || ws.role === "owner",
  );

  const handleInstall = (listing: MarketplaceListing) => {
    if (adminWorkspaces.length === 0) return;
    if (adminWorkspaces.length === 1) {
      // Skip consent dialog — install directly
      void doInstall(adminWorkspaces[0]!.slug, listing);
    } else {
      setConsentListing(listing);
    }
  };

  const doInstall = async (workspaceSlug: string, listing: MarketplaceListing) => {
    setInstalling(true);
    try {
      await install(workspaceSlug, listing.id);
      setInstalledIds((prev) => new Set([...prev, listing.id]));
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async (listing: MarketplaceListing) => {
    if (adminWorkspaces.length === 0) return;
    setInstalling(true);
    try {
      // Uninstall from first admin workspace
      await uninstall(adminWorkspaces[0]!.slug, listing.id);
      setInstalledIds((prev) => {
        const next = new Set(prev);
        next.delete(listing.id);
        return next;
      });
    } finally {
      setInstalling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted">Loading marketplace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-strong bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">Bot Marketplace</h1>
          <a href="/" className="text-sm text-slaq-blue hover:underline">
            Back to app
          </a>
        </div>
        <p className="mt-1 text-sm text-muted">
          Browse and install bots to supercharge your workspace.
        </p>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        {selectedListing ? (
          <ListingDetailView
            listing={selectedListing}
            installed={installedIds.has(selectedListing.id)}
            onInstall={() => handleInstall(selectedListing)}
            onUninstall={() => void handleUninstall(selectedListing)}
            onBack={() => setSelectedListing(null)}
            installing={installing}
          />
        ) : (
          <MarketplaceGrid
            listings={listings}
            installedIds={installedIds}
            onSelect={setSelectedListing}
          />
        )}
      </main>

      {consentListing && (
        <InstallConsentDialog
          open={!!consentListing}
          onOpenChange={(open) => {
            if (!open) setConsentListing(null);
          }}
          listing={consentListing}
          workspaces={adminWorkspaces.map((ws) => ({
            slug: ws.slug,
            name: ws.name,
          }))}
          onConfirm={async (slug) => {
            await doInstall(slug, consentListing);
            setConsentListing(null);
          }}
        />
      )}
    </div>
  );
}
