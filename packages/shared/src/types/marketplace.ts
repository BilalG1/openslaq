import type { BotScope, BotEventType } from "./bot";

export interface MarketplaceListing {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  longDescription: string | null;
  avatarUrl: string | null;
  category: string | null;
  requestedScopes: BotScope[];
  requestedEvents: BotEventType[];
  published: boolean;
}
