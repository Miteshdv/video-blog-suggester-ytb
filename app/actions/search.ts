"use server";

import { headers } from "next/headers";
import { cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db/db";
import { content, contentChunk, userSearches } from "@/db/schemas";
import { auth } from "@/lib/auth/config";
import { embedText } from "@/lib/embedding/embed-texts";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";

const MIN_SIMILARITY = 0.5;
const MAX_RESULTS = 20;

export type SearchResult = {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  url: string;
  type: "article" | "video";
  similarity: number;
  startPosition: number;
  rawText: string;
};

export type SearchResponse = { results: SearchResult[] } | { error: string };

export async function searchContent(query: string): Promise<SearchResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "You must be signed in to search" };

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return { results: [] };

  try {
    await checkRateLimit(session.user.id);
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    throw error;
  }

  const queryVector = await embedText(trimmedQuery.toLowerCase());
  const similarity = sql<number>`1 - (${cosineDistance(contentChunk.embedding, queryVector)})`;

  // One row per content item: the best matching chunk represents it.
  const matched = await db
    .selectDistinctOn([content.id], {
      id: content.id,
      title: content.title,
      description: content.description,
      thumbnail: content.thumbnail,
      url: content.url,
      type: content.type,
      similarity,
      startPosition: contentChunk.startPosition,
      rawText: contentChunk.text,
    })
    .from(contentChunk)
    .innerJoin(content, eq(content.id, contentChunk.contentId))
    .where(gt(similarity, MIN_SIMILARITY))
    .orderBy(content.id, desc(similarity));

  const results = matched
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_RESULTS);

  await db.insert(userSearches).values({
    queryText: trimmedQuery,
    userId: session.user.id,
    resultContentIds: results.map((result) => result.id),
  });

  return { results };
}
