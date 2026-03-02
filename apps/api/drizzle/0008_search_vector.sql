ALTER TABLE "messages" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX "idx_messages_search_vector" ON "messages" USING gin ("search_vector");
CREATE INDEX "idx_messages_channel_id_created_at" ON "messages" ("channel_id", "created_at" DESC);
