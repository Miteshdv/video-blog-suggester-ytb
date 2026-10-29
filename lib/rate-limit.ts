import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/db/db";
import { userSearches } from "@/db/schemas";
import { env as serverEnv } from "@/data/serverEnv";

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Throws RateLimitError when the user has used up their search quota for the
 * current window. Searches are recorded in `user_searches`, so the count is
 * derived from the same rows that back the history.
 */
export async function checkRateLimit(userId: string): Promise<void> {
  const maxRequests = serverEnv.RATE_LIMIT_MAX_REQUESTS;
  const windowHours = serverEnv.RATE_LIMIT_WINDOW_HOURS;
  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const [row] = await db
    .select({ recentCount: count() })
    .from(userSearches)
    .where(
      and(
        eq(userSearches.userId, userId),
        gt(userSearches.createdAt, windowStart),
      ),
    );

  if ((row?.recentCount ?? 0) >= maxRequests) {
    throw new RateLimitError(
      `Rate limit exceeded: you can only make ${maxRequests} searches per ${windowHours} hour${windowHours === 1 ? "" : "s"}. Please try again later.`,
    );
  }
}
