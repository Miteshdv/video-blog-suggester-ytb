CREATE TABLE "user_searches" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"query_text" text NOT NULL,
	"user_id" uuid NOT NULL,
	"result_content_ids" uuid[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_searches_userId_createdAt_idx" ON "user_searches" ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "user_searches" ADD CONSTRAINT "user_searches_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;