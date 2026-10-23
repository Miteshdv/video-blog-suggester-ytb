"use client";

import { useState } from "react";
import Image from "next/image";
import { authClient } from "@/lib/auth/client";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setError(null);
    setBusy(true);
    const { error } = await authClient.signIn.social({ provider: "github" });
    if (error) {
      setError(error.message ?? "Sign in failed");
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setError(null);
    setBusy(true);
    const { error } = await authClient.signOut();
    if (error) {
      setError(error.message ?? "Sign out failed");
    }
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 font-sans dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/[.08] bg-white p-8 text-center shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
        {isPending ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : session ? (
          <div className="flex flex-col items-center gap-4">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name}
                width={80}
                height={80}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-200 text-2xl font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {session.user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="text-lg font-semibold text-black dark:text-zinc-50">
              {session.user.name}
            </p>
            <button
              onClick={handleSignOut}
              disabled={busy}
              className="w-full rounded-full border border-black/[.08] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-white/[.06]"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
              Video Blog Suggester
            </h1>
            <p className="text-sm text-zinc-500">
              Sign in to get started.
            </p>
            <button
              onClick={handleSignIn}
              disabled={busy}
              className="w-full rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Sign in with GitHub
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </main>
  );
}
