import { NextResponse, type NextRequest } from "next/server";
import { start } from "workflow/api";
import { env as serverEnv } from "@/data/serverEnv";

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when
 * `CRON_SECRET` is set in the project environment.
 */
export async function verifyAndRunCron(
  request: NextRequest,
  runCron: () => Promise<unknown>,
) {
  const cronSecret = serverEnv.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await start(runCron);
  return NextResponse.json(
    { status: "started", runId: run.runId },
    { status: 202 },
  );
}
