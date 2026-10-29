"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import Header, { GitHubIcon } from "@/components/Header";
import SearchResults from "@/components/SearchResults";
import { searchContent, type SearchResult } from "@/app/actions/search";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await searchContent(searchQuery);
      if ("error" in response) {
        setError(response.error);
        setResults([]);
      } else {
        setResults(response.results);
      }
      setHasSearched(true);
    } catch {
      setError("Something went wrong while searching. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    void doSearch(query);
  }, [query, doSearch]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSearch();
      }
    },
    [handleSearch],
  );

  useEffect(() => {
    if (session) inputRef.current?.focus();
  }, [session]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <Header />

      <main className="flex w-full flex-1 flex-col items-center">
        <div className="flex w-full flex-col items-center pt-16 sm:pt-24">
          <div className="w-full max-w-2xl px-4 sm:px-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <SearchIcon className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    session
                      ? "Search for articles, videos, topics..."
                      : "Sign in to search"
                  }
                  disabled={!session}
                  className="block w-full rounded-xl border border-zinc-200 bg-white py-3.5 pl-11 pr-4 text-base text-zinc-900 placeholder-zinc-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
                />
              </div>

              <button
                type="button"
                onClick={handleSearch}
                disabled={!session || !query.trim() || isLoading}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <SpinnerIcon className="h-4 w-4 animate-spin" />
                    Searching
                  </>
                ) : (
                  <>
                    <SearchIcon className="h-4 w-4" />
                    Search
                  </>
                )}
              </button>
            </div>

            {!session && !isPending && (
              <div className="mt-6 flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  You need to sign in to search our content
                </p>
                <button
                  onClick={() =>
                    authClient.signIn.social({
                      provider: "github",
                      callbackURL: "/",
                    })
                  }
                  className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  <GitHubIcon className="h-4 w-4" />
                  Sign in with GitHub
                </button>
              </div>
            )}

            {isLoading && (
              <div className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            {!isLoading && !error && hasSearched && results.length === 0 && (
              <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No results found. Try a different search.
              </p>
            )}
          </div>
        </div>

        {results.length > 0 && (
          <div className="w-full pb-16 pt-8">
            <SearchResults results={results} />
          </div>
        )}
      </main>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
