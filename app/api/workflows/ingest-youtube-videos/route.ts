import type { NextRequest } from "next/server";
import { ingestYouTubeVideos } from "@/app/workflows/ingest-youtube-videos";
import { verifyAndRunCron } from "@/app/workflows/utils/verify-and-run-cron";

export async function GET(request: NextRequest) {
  return verifyAndRunCron(request, ingestYouTubeVideos);
}
