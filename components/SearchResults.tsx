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

  const lines = result.rawText.split("\n").filter((line) => line.trim());
  const first = lines[0] ?? result.rawText;
  const last = lines.at(-1) ?? first;
  const fragment =
    first === last
      ? encodeURIComponent(first)
      : `${encodeURIComponent(first)},${encodeURIComponent(last)}`;

  return `${result.url}#:~:text=${fragment}`;
}
