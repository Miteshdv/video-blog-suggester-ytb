import { integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./better-auth";

/**
 * Per-user search quota counter.
 *
 * Kept separate from `user_searches` so the quota can be reserved with a
 * single atomic upsert (`INSERT ... ON CONFLICT DO UPDATE`) before the
 * expensive embedding call. Counting history rows instead would allow
 * concurrent requests to all observe the same pre-insert count.
 */
export const searchQuota = pgTable("search_quota", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  windowStart: timestamp("window_start").notNull(),
  count: integer("count").notNull().default(0),
});
