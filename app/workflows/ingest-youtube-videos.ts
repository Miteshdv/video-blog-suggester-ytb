import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { FatalError } from "workflow";
import { type youtube_v3 } from "googleapis";
import { db } from "@/db/db";
import { content, contentChunk } from "@/db/schemas";
import { parseCaptions } from "@/lib/ingestion/captions";
import { createYouTubeClient } from "@/lib/ingestion/youtube-client";
import { embedTexts } from "@/lib/embedding/embed-texts";
import { batchExec } from "./utils/batch-exec";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 9 * 60 * 60 * 1000; // 9 hours between batches
const CHUNK_SIZE = 15; // segments per chunk
const OVERLAP_SIZE = 3; // segments shared with the previous chunk
const SEGMENT_STEP = CHUNK_SIZE - OVERLAP_SIZE;

type VideoToIngest = {
  videoId: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
};

export async function ingestYouTubeVideos() {
  "use workflow";

  const missingVideos = await getMissingVideos();
  const { succeeded, failures } = await batchExec(
    missingVideos,
    ingestVideo,
    { batchSize: BATCH_SIZE, delayMs: BATCH_DELAY_MS },
  );

  const ingested = succeeded.filter((result) => result === "ingested").length;

  return {
    ingested,
    skipped: succeeded.length - ingested,
    failed: failures.length,
    failures: failures.map(({ item, reason }) => ({
      url: `https://www.youtube.com/watch?v=${item.videoId}`,
      reason,
    })),
  };
}

async function getMissingVideos(): Promise<VideoToIngest[]> {
  "use step";

  const youtube = createYouTubeClient();

  // The authenticated user's channel; `mine: true` works with the
  // `youtube.force-ssl` scope granted by the consent flow.
  const channelResponse = await youtube.channels.list({
    part: ["contentDetails"],
    mine: true,
  });
  const uploadsPlaylistId =
    channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error(
      "Could not resolve the uploads playlist for the authenticated channel",
    );
  }

  const publicItems: youtube_v3.Schema$PlaylistItem[] = [];
  let nextPageToken: string | undefined;
  do {
    const response = await youtube.playlistItems.list({
      part: ["snippet", "contentDetails", "status"],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken: nextPageToken,
    });

    const items = response.data.items ?? [];
    publicItems.push(
      ...items.filter((item) => item.status?.privacyStatus === "public"),
    );

    nextPageToken = response.data.nextPageToken ?? undefined;
  } while (nextPageToken !== undefined);

  const videos: VideoToIngest[] = [];
  for (const item of publicItems) {
    const videoId = item.contentDetails?.videoId;
    const title = item.snippet?.title;
    if (!videoId || !title) continue;

    videos.push({
      videoId,
      title,
      description: item.snippet?.description ?? null,
      publishedAt: item.snippet?.publishedAt ?? null,
      thumbnailUrl: item.snippet?.thumbnails?.high?.url ?? null,
    });
  }

  const existing = await db
    .select({ url: content.url })
    .from(content)
    .where(eq(content.type, "video"));
  const existingUrls = new Set(existing.map((row) => row.url));

  return videos.filter(
    (video) =>
      !existingUrls.has(`https://www.youtube.com/watch?v=${video.videoId}`),
  );
}

async function ingestVideo(
  video: VideoToIngest,
): Promise<"ingested" | "skipped"> {
  "use step";

  const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

  const youtube = createYouTubeClient();

  // Fetch the video's content details (duration, definition, etc.) alongside
  // its caption tracks.
  const [videoResponse, captionResponse] = await Promise.all([
    youtube.videos.list({
      part: ["contentDetails", "snippet", "status"],
      id: [video.videoId],
    }),
    youtube.captions.list({
      part: ["snippet"],
      videoId: video.videoId,
    }),
  ]);

  const videoDetails = videoResponse.data.items?.[0];
  if (!videoDetails) {
    throw new FatalError(`Video not found for ${videoUrl}`);
  }

  const captionTracks = captionResponse.data.items ?? [];
  const englishTrack = captionTracks.find(
    (track) => track.snippet?.language === "en",
  );
  if (!englishTrack?.id) {
    throw new FatalError(`No English captions available for ${videoUrl}`);
  }

  const downloadResponse = await youtube.captions.download(
    { id: englishTrack.id, tfmt: "srt" },
    { responseType: "text" },
  );
  const srtContent = downloadResponse.data;
  if (typeof srtContent !== "string" || srtContent.length === 0) {
    throw new FatalError(`Captions download failed for ${videoUrl}`);
  }

  const segments = parseCaptions(srtContent);
  if (segments.length === 0) {
    throw new FatalError(`No caption segments parsed for ${videoUrl}`);
  }

  // Overlapping chunks: each chunk starts SEGMENT_STEP segments after the
  // previous one, so consecutive chunks share OVERLAP_SIZE segments.
  const chunks: { text: string; startPosition: number }[] = [];
  for (let index = 0; index < segments.length; index += SEGMENT_STEP) {
    const chunkSegments = segments.slice(index, index + CHUNK_SIZE);
    if (chunkSegments.length === 0) continue;
    chunks.push({
      text: chunkSegments.map((segment) => segment.text).join(" "),
      startPosition: chunkSegments[0].startTime,
    });
  }

  const alreadyStored = await db
    .select({ id: content.id })
    .from(content)
    .where(eq(content.url, videoUrl))
    .limit(1);
  if (alreadyStored.length > 0) return "skipped";

  const contentId = randomUUID();
  const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));

  // Store the video's content details (duration, definition, etc.) as JSON
  // alongside the SRT transcript in the existing content column.
  const contentBody = JSON.stringify({
    contentDetails: videoDetails.contentDetails ?? null,
    snippet: videoDetails.snippet ?? null,
    status: videoDetails.status ?? null,
    srt: srtContent,
  });

  // neon-http has no interactive transactions, but batch() runs atomically.
  await db.batch([
    db.insert(content).values({
      id: contentId,
      url: videoUrl,
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnailUrl,
      publishedAt: video.publishedAt ? new Date(video.publishedAt) : null,
      type: "video",
      content: contentBody,
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
