import { sql } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType: () => "vector",
  toDriver: (value) => JSON.stringify(value),
  fromDriver: (value) => {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "number")) {
      throw new Error("Database returned an invalid vector value");
    }
    return parsed;
  },
});

export const contentType = pgEnum("content_type", ["article", "video"]);

export const content = pgTable(
  "content",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    publishedAt: timestamp("published_at"),
    url: text("url").notNull(),
    thumbnail: text("thumbnail"),
    type: contentType("type").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("content_url_uidx").on(table.url)],
);

export const contentChunk = pgTable(
  "content_chunk",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    startPosition: integer("start_position").notNull(),
    embedding: vector("embedding"),
    text: text("text").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("content_chunk_content_start_uidx").on(
      table.contentId,
      table.startPosition,
    ),
    index("content_chunk_contentId_idx").on(table.contentId),
  ],
);
