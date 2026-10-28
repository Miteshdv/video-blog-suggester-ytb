import { env as serverEnv } from "@/data/serverEnv";

export type EmbeddingModel = "text-embedding-3-small" | "text-embedding-3-large";

export const EMBEDDING_DIMENSIONS: Record<EmbeddingModel, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
};

export function getEmbeddingModel(): EmbeddingModel {
  return serverEnv.OPENAI_EMBEDDING_MODEL;
}

export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS[getEmbeddingModel()];
}