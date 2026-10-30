import { google } from "googleapis";
import { env as serverEnv } from "@/data/serverEnv";

/**
 * Creates an OAuth2 client for the YouTube Data API using a long-lived
 * refresh token. The token is exchanged for a short-lived access token on
 * each request, so no interactive sign-in is needed at ingestion time.
 */
export function createYouTubeClient() {
  const clientId = serverEnv.GOOGLE_CLIENT_ID;
  const clientSecret = serverEnv.GOOGLE_CLIENT_SECRET;
  const refreshToken = serverEnv.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN are required to ingest YouTube videos",
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.youtube({ version: "v3", auth: oauth2Client });
}
