import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { env as serverEnv } from "@/data/serverEnv";
import {
  getEmbeddingDimensions,
  getEmbeddingModel,
} from "./get-embedding-model";

// OpenAI accepts up to 2048 inputs per request; keep batches modest so a
// single failure costs little work.
const MAX_INPUTS_PER_REQUEST = 100;

let openai: ReturnType<typeof createOpenAI> | undefined;

// Created lazily so importing this module (e.g. during `next build` page data
// collection) does not require OPENAI_API_KEY to be present.
function getOpenAIClient() {
  if (!openai) {
    const apiKey = serverEnv.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required to generate embeddings");
    }
    openai = createOpenAI({ apiKey });
  }
  return openai;
}

/**
 * Embeds texts with OpenAI. Input order is preserved: result[i] is the
 * embedding of texts[i].
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const expectedDimensions = getEmbeddingDimensions();
  const model = getOpenAIClient().embeddingModel(getEmbeddingModel());
  const embeddings: number[][] = [];

  for (let offset = 0; offset < texts.length; offset += MAX_INPUTS_PER_REQUEST) {
    const batch = texts.slice(offset, offset + MAX_INPUTS_PER_REQUEST);
    const { embeddings: batchEmbeddings } = await embedMany({
      model,
      values: batch,
      abortSignal: AbortSignal.timeout(60_000),
    });

    batchEmbeddings.forEach((embedding) => {
      if (embedding.length !== expectedDimensions) {
        throw new Error(
          `OpenAI returned an embedding with ${embedding.length} dimensions, expected ${expectedDimensions}`,
        );
      }
      embeddings.push(embedding);
    });
  }

  return embeddings;
}
