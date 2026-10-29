import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./better-auth";

export const userSearches = pgTable(
  "user_searches",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    queryText: text("query_text").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    resultContentIds: uuid("result_content_ids").array().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_searches_userId_createdAt_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);
