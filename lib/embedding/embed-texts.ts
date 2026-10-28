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

const openai = createOpenAI({ apiKey: serverEnv.OPENAI_API_KEY });

/**
 * Embeds texts with OpenAI. Input order is preserved: result[i] is the
 * embedding of texts[i].
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const expectedDimensions = getEmbeddingDimensions();
  const model = openai.embeddingModel(getEmbeddingModel());
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
