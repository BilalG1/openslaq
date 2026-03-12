import { AuthError } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";
import type { MarketplaceListing } from "@openslaq/shared";

export async function listMarketplaceListings(deps: ApiDeps): Promise<MarketplaceListing[]> {
  const { api, auth } = deps;
  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.marketplace.$get({}, { headers }),
    );
    return (await response.json()) as MarketplaceListing[];
  } catch (err) {
    if (err instanceof AuthError) auth.onAuthRequired();
    throw err;
  }
}

export async function getMarketplaceListing(deps: ApiDeps, slug: string): Promise<MarketplaceListing> {
  const { api, auth } = deps;
  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.marketplace[":slug"].$get({ param: { slug } }, { headers }),
    );
    return (await response.json()) as MarketplaceListing;
  } catch (err) {
    if (err instanceof AuthError) auth.onAuthRequired();
    throw err;
  }
}

export async function installMarketplaceListing(
  deps: ApiDeps,
  workspaceSlug: string,
  listingId: string,
): Promise<void> {
  const { api, auth } = deps;
  try {
    await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].marketplace.install.$post(
        { param: { slug: workspaceSlug }, json: { listingId } },
        { headers },
      ),
    );
  } catch (err) {
    if (err instanceof AuthError) auth.onAuthRequired();
    throw err;
  }
}

export async function uninstallMarketplaceListing(
  deps: ApiDeps,
  workspaceSlug: string,
  listingId: string,
): Promise<void> {
  const { api, auth } = deps;
  try {
    await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].marketplace[":listingId"].uninstall.$delete(
        { param: { slug: workspaceSlug, listingId } },
        { headers },
      ),
    );
  } catch (err) {
    if (err instanceof AuthError) auth.onAuthRequired();
    throw err;
  }
}

export async function getInstalledListings(
  deps: ApiDeps,
  workspaceSlug: string,
): Promise<string[]> {
  const { api, auth } = deps;
  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api.workspaces[":slug"].marketplace.installed.$get(
        { param: { slug: workspaceSlug } },
        { headers },
      ),
    );
    const data = (await response.json()) as { installedListingIds: string[] };
    return data.installedListingIds;
  } catch (err) {
    if (err instanceof AuthError) auth.onAuthRequired();
    throw err;
  }
}
