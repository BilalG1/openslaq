import type { MarketplaceListing } from "@openslaq/shared";
import { Avatar, Badge } from "../ui";

interface ListingCardProps {
  listing: MarketplaceListing;
  installed: boolean;
  onClick: () => void;
}

export function ListingCard({ listing, installed, onClick }: ListingCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-secondary"
      data-testid={`listing-card-${listing.slug}`}
    >
      <div className="flex items-center gap-3">
        <Avatar
          src={listing.avatarUrl}
          fallback={listing.name.charAt(0)}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-primary">{listing.name}</h3>
            {installed && <Badge variant="blue">Installed</Badge>}
          </div>
          {listing.category && (
            <Badge variant="gray" className="mt-1">
              {listing.category}
            </Badge>
          )}
        </div>
      </div>
      {listing.description && (
        <p className="text-sm text-muted line-clamp-2">{listing.description}</p>
      )}
    </button>
  );
}
