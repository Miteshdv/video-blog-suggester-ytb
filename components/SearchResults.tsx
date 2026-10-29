"use client";

import Image from "next/image";
import type { SearchResult } from "@/app/actions/search";

export default function SearchResults({ results }: { results: SearchResult[] }) {
  if (results.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 px-4 sm:px-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {results.length} result{results.length === 1 ? "" : "s"} found
      </p>

      {results.map((result) => (
        <a
          key={result.id}
          href={getUrlAtChunkLocation(result)}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <div className="flex-shrink-0">
            {result.thumbnail ? (
              <Image
                src={result.thumbnail}
                alt={result.title}
                width={160}
                height={96}
                className="h-24 w-40 rounded-lg bg-zinc-100 object-cover dark:bg-zinc-800"
              />
            ) : (
              <div className="flex h-24 w-40 items-center justify-center rounded-lg bg-zinc-100 text-2xl dark:bg-zinc-800">
                {result.type === "video" ? "🎬" : "📄"}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
                {result.title}
              </h3>
              <span className="flex-shrink-0 text-sm font-semibold text-green-600 dark:text-green-400">
                {Math.round(result.similarity * 100)}% match
              </span>
            </div>

            {result.description && (
              <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                {result.description}
              </p>
            )}

            <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 font-medium dark:bg-zinc-800">
                {result.type === "video" ? "🎬" : "📄"} {result.type}
              </span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

/**
 * Links to the exact spot in the source that matched: text fragments for
 * articles, timestamps for videos.
 */
function getUrlAtChunkLocation(result: SearchResult): string {
  if (result.type === "video") {
    return `${result.url}&t=${Math.floor(result.startPosition / 1000)}`;
  }

  const fragment = buildTextFragment(result.rawText);
  return fragment ? `${result.url}#:~:text=${fragment}` : result.url;
}

const MAX_FRAGMENT_WORDS = 10;
const MIN_FRAGMENT_WORDS = 3;
const CODE_CHARS = /[{}()[\];=<>/\\|`$*#@~^]/;
const CODE_IDENTIFIER = /^[a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$/;

/**
 * Builds a `text=` fragment that stays inside a single text block.
 *
 * Chunks are whitespace-normalized sections (heading + paragraphs), so we
 * cannot rely on newlines to find block boundaries. Text fragments cannot
 * match across HTML blocks, and a start/end pair spanning the whole chunk
 * would do exactly that. Instead we take a short *contiguous* phrase from one
 * prose sentence, which is far more likely to sit inside a single block.
 *
 * Returns null when no safe phrase can be found; callers then fall back to the
 * plain article URL rather than emitting a fragment that cannot match.
 */
function buildTextFragment(rawText: string): string | null {
  const text = rawText.replace(/\s+/g, " ").trim();
  if (!text) return null;

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizePunctuation(sentence.trim()))
    .filter((sentence) => sentence.split(" ").length >= MIN_FRAGMENT_WORDS)
    .filter((sentence) => /^[A-Z]/.test(sentence))
    // Code snippets and CSS rules make poor fragments: their rendered text
    // often differs from the extracted text, so the fragment never matches.
    .filter((sentence) => !CODE_CHARS.test(sentence))
    .filter((sentence) => !sentence.split(" ").some((w) => CODE_IDENTIFIER.test(w)))
    .filter((sentence) => numericWordRatio(sentence) <= 0.2)
    // A chunk starts with its section heading, which is a separate block in
    // the rendered page, so a fragment beginning there can never match.
    .filter((sentence) => !looksLikeHeadingMerge(sentence));

  const candidates = (sentences.length > 1 ? sentences.slice(1) : sentences)
    .sort((a, b) => b.length - a.length);

  const sentence = candidates[0];
  if (!sentence) return null;

  return encodeURIComponent(
    sentence.split(" ").slice(0, MAX_FRAGMENT_WORDS).join(" "),
  );
}

/** Inline markup leaves stray spaces before punctuation (`initial ,`). */
function normalizePunctuation(sentence: string): string {
  return sentence.replace(/\s+([,.;:!?])/g, "$1");
}

/** Detects `Heading Next sentence starts here` merges. */
function looksLikeHeadingMerge(sentence: string): boolean {
  const words = sentence.split(" ");
  if (words.length < 2) return true;
  const second = words[1];
  return /^[A-Z]/.test(second) && second !== "I";
}

function numericWordRatio(sentence: string): number {
  const words = sentence.split(" ");
  return words.filter((word) => /^\d+$/.test(word)).length / words.length;
}
