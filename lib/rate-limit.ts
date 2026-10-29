import { sql } from "drizzle-orm";
import { db } from "@/db/db";
import { env as serverEnv } from "@/data/serverEnv";

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Atomically reserves one unit of search quota for the user.
 *
 * Uses a single `INSERT ... ON CONFLICT DO UPDATE` against `search_quota`, so
 * concurrent requests serialize on the row lock instead of all observing the
 * same pre-insert count. This matters because the neon-http driver does not
 * support interactive transactions.
 *
 * Throws RateLimitError when the user has used up their quota for the current
 * window. Reserved-but-failed searches still count against the quota, which
 * is intentional: it prevents burning quota via repeated failures.
 */
export async function reserveSearchQuota(userId: string): Promise<void> {
  const maxRequests = serverEnv.RATE_LIMIT_MAX_REQUESTS;
  const windowHours = serverEnv.RATE_LIMIT_WINDOW_HOURS;

  const result = await db.execute(sql`
    insert into search_quota (user_id, window_start, count)
    values (${userId}, now(), 1)
    on conflict (user_id) do update
    set
      count = case
        when search_quota.window_start <= now() - (${windowHours} * interval '1 hour')
          then 1
        else search_quota.count + 1
      end,
      window_start = case
        when search_quota.window_start <= now() - (${windowHours} * interval '1 hour')
          then now()
        else search_quota.window_start
      end
    where
      search_quota.window_start <= now() - (${windowHours} * interval '1 hour')
      or search_quota.count < ${maxRequests}
    returning count
  `);

  if (result.rows.length === 0) {
    throw new RateLimitError(
      `Rate limit exceeded: you can only make ${maxRequests} searches per ${windowHours} hour${windowHours === 1 ? "" : "s"}. Please try again later.`,
    );
  }
}
