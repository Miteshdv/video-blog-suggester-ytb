CREATE TABLE "search_quota" (
	"user_id" uuid PRIMARY KEY,
	"window_start" timestamp NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "search_quota" ADD CONSTRAINT "search_quota_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;