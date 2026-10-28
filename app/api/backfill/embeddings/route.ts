import { start } from "workflow/api";
import { NextResponse } from "next/server";
import { backfillEmbeddings } from "@/app/workflows/backfill-embeddings";

export async function POST(request: Request) {
  const secret = process.env.ARTICLE_INGEST_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "ARTICLE_INGEST_SECRET is not configured" },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await start(backfillEmbeddings, []);
  return NextResponse.json(
    { status: "started", runId: run.runId },
    { status: 202 },
  );
}