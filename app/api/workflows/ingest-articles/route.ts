import type { NextRequest } from "next/server";
import { ingestArticles } from "@/app/workflows/ingest-articles";
import { verifyAndRunCron } from "@/app/workflows/utils/verify-and-run-cron";

export async function GET(request: NextRequest) {
  return verifyAndRunCron(request, ingestArticles);
}
