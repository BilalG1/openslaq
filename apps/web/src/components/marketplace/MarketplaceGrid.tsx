import type { MarketplaceListing } from "@openslaq/shared";
import { ListingCard } from "./ListingCard";

interface MarketplaceGridProps {
  listings: MarketplaceListing[];
  installedIds: Set<string>;
  onSelect: (listing: MarketplaceListing) => void;
}

export function MarketplaceGrid({ listings, installedIds, onSelect }: MarketplaceGridProps) {
  if (listings.length === 0) {
    return (
      <div className="py-12 text-center text-muted" data-testid="marketplace-empty">
        No bots available yet.
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="marketplace-grid"
    >
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          installed={installedIds.has(listing.id)}
          onClick={() => onSelect(listing)}
        />
      ))}
    </div>
  );
}
