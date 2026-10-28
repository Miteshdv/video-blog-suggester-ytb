import { randomUUID } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { content, contentChunk } from "@/db/schemas";
import { getArticleMetadata } from "@/lib/ingestion/article-content";
import { embedTexts } from "@/lib/embedding/embed-texts";
import { batchExec } from "./utils/batch-exec";

const RSS_URL = "https://blog.webdevsimplified.com/rss.xml";
const BLOG_HOST = "blog.webdevsimplified.com";
const BATCH_SIZE = 10;

type RssItem = {
  title?: unknown;
  link?: unknown;
  description?: unknown;
  pubDate?: unknown;
};

type ArticleToIngest = {
  title: string;
  url: string;
  description: string | null;
  publishedAt: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getRssItems(xml: string): ArticleToIngest[] {
  const parsed: unknown = new XMLParser({
    ignoreAttributes: true,
    trimValues: true,
  }).parse(xml);

  if (
    !isRecord(parsed) ||
    !isRecord(parsed.rss) ||
    !isRecord(parsed.rss.channel)
  ) {
    throw new Error("RSS feed has an unexpected structure");
  }

  const rawItems = parsed.rss.channel.item;
  if (rawItems === undefined) return [];

  const items: RssItem[] = Array.isArray(rawItems)
    ? (rawItems as RssItem[])
    : [rawItems as RssItem];

  return items.flatMap((item) => {
    if (typeof item.title !== "string" || typeof item.link !== "string") {
      throw new Error("RSS feed contains an article without a title or link");
    }

    const url = new URL(item.link);
    if (url.protocol !== "https:" || url.hostname !== BLOG_HOST) {
      throw new Error(`RSS feed contains an unexpected article URL: ${item.link}`);
    }

    const publishedAt =
      typeof item.pubDate === "string" && !Number.isNaN(Date.parse(item.pubDate))
        ? new Date(item.pubDate).toISOString()
        : null;

    return [
      {
        title: item.title,
        url: url.toString(),
        description:
          typeof item.description === "string" ? item.description : null,
        publishedAt,
      },
    ];
  });
}

export async function ingestArticles() {
  "use workflow";

  const missingArticles = await getMissingArticles();
  const { succeeded, failures } = await batchExec(
    missingArticles,
    ingestArticle,
    { batchSize: BATCH_SIZE },
  );

  const ingested = succeeded.filter((result) => result === "ingested").length;

  return {
    ingested,
    skipped: succeeded.length - ingested,
    failed: failures.length,
    failures: failures.map(({ item, reason }) => ({ url: item.url, reason })),
  };
}

async function getMissingArticles(): Promise<ArticleToIngest[]> {
  "use step";

  const response = await fetch(RSS_URL, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`RSS request failed with status ${response.status}`);
  }

  const rssItems = getRssItems(await response.text());
  const existing = await db
    .select({ url: content.url })
    .from(content)
    .where(eq(content.type, "article"));
  const existingUrls = new Set(existing.map((row) => row.url));

  return rssItems.filter((item) => !existingUrls.has(item.url));
}

async function ingestArticle(
  item: ArticleToIngest,
): Promise<"ingested" | "skipped"> {
  "use step";

  const url = new URL(item.url);
  if (url.protocol !== "https:" || url.hostname !== BLOG_HOST) {
    throw new Error(`Refusing to fetch an unexpected article URL: ${item.url}`);
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Article request failed for ${url} with status ${response.status}`);
  }

  // Some RSS links redirect (e.g. to a trailing-slash URL); make sure we never
  // follow a redirect off the blog host.
  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== "https:" || finalUrl.hostname !== BLOG_HOST) {
    throw new Error(`Article at ${url} redirected to an unexpected URL: ${finalUrl}`);
  }

  const html = await response.text();
  const { thumbnailUrl, content: articleContent, chunks } = getArticleMetadata(
    html,
    finalUrl.toString(),
  );
  if (chunks.length === 0) {
    throw new Error(`Article at ${url} did not contain readable article text`);
  }

  const alreadyStored = await db
    .select({ id: content.id })
    .from(content)
    .where(eq(content.url, item.url))
    .limit(1);
  if (alreadyStored.length > 0) return "skipped";

  const contentId = randomUUID();
  const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));

  // neon-http has no interactive transactions, but batch() runs atomically.
  await db.batch([
    db.insert(content).values({
      id: contentId,
      url: item.url,
      title: item.title,
      description: item.description,
      thumbnail: thumbnailUrl,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
      type: "article",
      content: articleContent,
    }),
    db.insert(contentChunk).values(
      chunks.map((chunk, index) => ({
        contentId,
        startPosition: chunk.startPosition,
        text: chunk.text,
        embedding: embeddings[index],
      })),
    ),
  ]);

  return "ingested";
}
