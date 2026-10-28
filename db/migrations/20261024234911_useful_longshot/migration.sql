CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "content_type" AS ENUM('article', 'video');--> statement-breakpoint
CREATE TABLE "content" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"title" text NOT NULL,
	"description" text,
	"published_at" timestamp,
	"url" text NOT NULL,
	"thumbnail" text,
	"type" "content_type" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_chunk" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"content_id" uuid NOT NULL,
	"start_position" integer NOT NULL,
	"embedding" vector,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "content_url_uidx" ON "content" ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "content_chunk_content_start_uidx" ON "content_chunk" ("content_id","start_position");--> statement-breakpoint
CREATE INDEX "content_chunk_contentId_idx" ON "content_chunk" ("content_id");--> statement-breakpoint
ALTER TABLE "content_chunk" ADD CONSTRAINT "content_chunk_content_id_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE;