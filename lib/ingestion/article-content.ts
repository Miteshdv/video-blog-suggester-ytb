import { load, type CheerioAPI } from "cheerio";

const BLOCK_ELEMENTS = new Set([
  "address",
  "article",
  "blockquote",
  "br",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "td",
  "th",
  "tr",
  "ul",
]);

type HtmlNode = {
  type: string;
  data?: string;
  name?: string;
  children?: HtmlNode[];
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function splitArticleIntoChunks(html: string): string[] {
  const $ = load(html);
  const main = $("article main").first();

  if (main.length === 0) {
    throw new Error("Article page does not contain a <main> inside <article>");
  }

  main.find("script, style, noscript, template").remove();

  const chunks: string[] = [];
  let currentText = "";

  const flush = () => {
    const content = normalizeWhitespace(currentText);
    if (content) chunks.push(content);
    currentText = "";
  };

  const walk = (node: HtmlNode): void => {
    if (node.type === "text") {
      currentText += `${node.data ?? ""} `;
      return;
    }

    if (node.name === "h2") {
      flush();
      for (const child of node.children ?? []) walk(child);
      currentText += " ";
      return;
    }

    const isBlock = BLOCK_ELEMENTS.has(node.name ?? "");
    if (isBlock) currentText += " ";
    for (const child of node.children ?? []) walk(child);
    if (isBlock) currentText += " ";
  };

  for (const child of (main[0] as HtmlNode).children ?? []) walk(child);
  flush();

  return chunks;
}

export function getArticleMetadata(html: string, pageUrl: string): {
  thumbnailUrl: string | null;
  content: string;
  chunks: { text: string; startPosition: number }[];
} {
  const $: CheerioAPI = load(html);
  const image = $('meta[property="og:image"]').first().attr("content")?.trim();
  const textChunks = splitArticleIntoChunks(html);
  let startPosition = 0;
  const chunks = textChunks.map((text) => {
    const chunk = { text, startPosition };
    startPosition += Array.from(text).length + 2;
    return chunk;
  });

  return {
    thumbnailUrl: image ? new URL(image, pageUrl).toString() : null,
    content: textChunks.join("\n\n"),
    chunks,
  };
}
