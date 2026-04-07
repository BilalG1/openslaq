CREATE TABLE "voip_push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" "push_platform" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "voip_push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "voip_push_tokens" ADD CONSTRAINT "voip_push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_voip_push_tokens_user_id" ON "voip_push_tokens" USING btree ("user_id");