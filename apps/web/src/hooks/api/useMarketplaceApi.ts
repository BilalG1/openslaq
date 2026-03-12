import { useCallback } from "react";
import {
  listMarketplaceListings as coreListListings,
  getMarketplaceListing as coreGetListing,
  installMarketplaceListing as coreInstall,
  uninstallMarketplaceListing as coreUninstall,
  getInstalledListings as coreGetInstalled,
} from "@openslaq/client-core";
import type { MarketplaceListing } from "@openslaq/shared";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";

export function useMarketplaceApi() {
  const auth = useAuthProvider();

  const listListings = useCallback(async (): Promise<MarketplaceListing[]> => {
    return coreListListings({ api, auth });
  }, [auth]);

  const getListing = useCallback(
    async (slug: string): Promise<MarketplaceListing> => {
      return coreGetListing({ api, auth }, slug);
    },
    [auth],
  );

  const install = useCallback(
    async (workspaceSlug: string, listingId: string): Promise<void> => {
      return coreInstall({ api, auth }, workspaceSlug, listingId);
    },
    [auth],
  );

  const uninstall = useCallback(
    async (workspaceSlug: string, listingId: string): Promise<void> => {
      return coreUninstall({ api, auth }, workspaceSlug, listingId);
    },
    [auth],
  );

  const getInstalled = useCallback(
    async (workspaceSlug: string): Promise<string[]> => {
      return coreGetInstalled({ api, auth }, workspaceSlug);
    },
    [auth],
  );

  return { listListings, getListing, install, uninstall, getInstalled };
}
