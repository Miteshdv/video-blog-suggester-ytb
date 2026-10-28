import { env as serverEnv } from "@/data/serverEnv";
import { EMBEDDING_DIMENSION } from "@/db/schemas/articles";

export type EmbeddingModel = "text-embedding-3-small" | "text-embedding-3-large";

export function getEmbeddingModel(): EmbeddingModel {
  return serverEnv.OPENAI_EMBEDDING_MODEL;
}

/**
 * The database column is fixed at EMBEDDING_DIMENSION, so every model is asked
 * for that many output dimensions (text-embedding-3-* support truncation).
 */
export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSION;
}
