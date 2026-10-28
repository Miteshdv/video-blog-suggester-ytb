import { sleep } from "workflow";
import { asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/db";
import { contentChunk } from "@/db/schemas";
import { embedTexts } from "@/lib/embedding/embed-texts";

// One workflow iteration = one OpenAI embeddings request (embedTexts batches
// up to 100 inputs per request) plus one atomic db.batch of updates.
const BATCH_SIZE = 50;
const DELAY_MS = 1_000;

type ChunkToEmbed = { id: string; text: string };
type EmbeddingUpdate = { id: string; embedding: number[] };

async function getUnembeddedChunks(limit: number): Promise<ChunkToEmbed[]> {
  "use step";

  return db
    .select({ id: contentChunk.id, text: contentChunk.text })
    .from(contentChunk)
    .where(isNull(contentChunk.embedding))
    .orderBy(asc(contentChunk.createdAt), asc(contentChunk.id))
    .limit(limit);
}

async function embedChunks(chunks: ChunkToEmbed[]): Promise<EmbeddingUpdate[]> {
  "use step";

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
  return chunks.map((chunk, index) => ({
    id: chunk.id,
    embedding: embeddings[index],
  }));
}

async function saveEmbeddings(updates: EmbeddingUpdate[]): Promise<number> {
  "use step";

  // neon-http has no interactive transactions, but batch() runs atomically.
  // Updates are keyed by id, so a retried step can never corrupt a row.
  // db.batch's type requires a non-empty tuple; the caller only proceeds
  // after fetching a non-empty chunk batch, so updates is never empty.
  const toUpdate = ({ id, embedding }: EmbeddingUpdate) =>
    db.update(contentChunk).set({ embedding }).where(eq(contentChunk.id, id));
  const [first, ...rest] = updates;
  await db.batch([toUpdate(first), ...rest.map(toUpdate)]);
  return updates.length;
}

async function countUnembeddedChunks(): Promise<number> {
  "use step";

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contentChunk)
    .where(isNull(contentChunk.embedding));
  return row?.count ?? 0;
}

/**
 * Backfills embeddings for every chunk stored before embeddings were wired
 * into ingestion. Restart-safe: each step is idempotent, completed steps are
 * replayed from the durable log on resume, and saved rows drop out of the
 * "embedding IS NULL" queue, so a crashed run can simply be re-triggered.
 */
export async function backfillEmbeddings() {
  "use workflow";

  let processed = 0;
  let batches = 0;

  for (;;) {
    const batch = await getUnembeddedChunks(BATCH_SIZE);
    if (batch.length === 0) break;

    const updates = await embedChunks(batch);
    processed += await saveEmbeddings(updates);
    batches += 1;

    if (batch.length === BATCH_SIZE) await sleep(DELAY_MS);
  }

  return { processed, batches, remaining: await countUnembeddedChunks() };
}