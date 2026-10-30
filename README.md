This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Article ingestion

Apply the database migrations, then set `ARTICLE_INGEST_SECRET` in the deployment
environment. Start an ingestion run with an authenticated `POST` request to
`/api/ingest/articles`, using `Authorization: Bearer <ARTICLE_INGEST_SECRET>`.
The workflow reads the Web Dev Simplified RSS feed, skips URLs already stored,
and fetches the remaining article pages in batches of at most 10. It saves each
article's Open Graph image and plain-text chunks split at H2 headings. Text
before the first H2 is kept as its own chunk. Chunk embeddings are generated
with OpenAI (`OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL`) as each article is
ingested; run `/api/backfill/embeddings` to embed pre-existing chunks.
Embeddings are always requested at 1536 dimensions to match the database
column, so either supported model can be selected without a migration.

### Scheduled ingestion

`vercel.json` registers a Vercel Cron job that calls
`GET /api/workflows/ingest-articles` every Tuesday at 00:00 UTC. Vercel sends
`Authorization: Bearer $CRON_SECRET` automatically, so set `CRON_SECRET` in the
project environment (Production and Preview) and redeploy. The route returns
`202` with a `runId`; track the run under Observability → Workflows.

To trigger it manually:

```bash
curl -X GET "https://<your-domain>/api/workflows/ingest-articles" \
  -H "Authorization: Bearer $CRON_SECRET"
```


## YouTube video ingestion

The workflow ingests the authenticated channel's public uploads. It resolves
the channel's uploads playlist (`channels.list` with `mine: true`), lists all
public playlist items, skips videos already stored, and downloads each video's
English caption track (`captions.list` + `captions.download` as SRT). The SRT
is parsed into segments and stored as overlapping chunks of 15 segments with a
3-segment overlap; each chunk is embedded with OpenAI at ingestion time. The
video's `snippet`, `contentDetails`, `status`, and the raw SRT are stored as
JSON in the content body. Videos without an English caption track
are recorded as failures and skipped.

### Google OAuth setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or
   select) a project and enable the **YouTube Data API v3**.
2. Create an **OAuth client ID** (type: Web application) and add your
   redirect URI. Set the client ID and secret as `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`.
3. Request the `https://www.googleapis.com/auth/youtube.force-ssl` scope.
   `captions.list` and `captions.download` accept only `youtube.force-ssl` or
   `youtubepartner`; `youtube.readonly` is **not** sufficient for caption
   downloads.
4. Complete the OAuth flow once with `access_type=offline` and
   `prompt=consent` to obtain a refresh token, and store it as
   `GOOGLE_REFRESH_TOKEN`. The client exchanges the refresh token for a
   short-lived access token on each ingestion run, so no interactive sign-in
   is needed at runtime.

Note: caption downloads are only authorized for videos owned by the
authenticated channel, so ingestion is limited to your own uploads.

#### Troubleshooting the OAuth flow

- **`Error 403: access_denied` / "Access blocked"** - the OAuth consent screen
  is in *Testing* mode and your account is not a test user. Add it under
  **Audience -> Test users** in the Google Cloud Console.
- **Refresh token stops working after ~7 days** - apps whose publishing status
  is *Testing* are issued refresh tokens that expire in 7 days, which is
  shorter than the weekly cron interval. Click **Publish app** on the
  **Audience** page to move the app to *In production*. Verification review is
  not required for personal use; the consent screen shows an "unverified app"
  warning that you can dismiss via **Advanced -> Go to (unsafe)**.
- **`403 insufficientPermissions` from `captions.download`** - the token was
  minted without the `youtube.force-ssl` scope. Re-run the consent flow with
  `prompt=consent`.

### Environment variables

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` - OAuth
  credentials for the YouTube Data API (optional; ingestion fails without
  them).
- `YOUTUBE_INGEST_SECRET` - bearer token for the manual trigger route
  (`POST /api/ingest/youtube-videos`).
- `CRON_SECRET` - used by the scheduled workflow route below.

### Scheduled ingestion

`vercel.json` registers a Vercel Cron job that calls
`GET /api/workflows/ingest-youtube-videos` every Tuesday at 01:00 UTC (after
the article ingestion run). Vercel sends
`Authorization: Bearer $CRON_SECRET` automatically, so set `CRON_SECRET` in the
project environment (Production and Preview) and redeploy. The route returns
`202` with a `runId`; track the run under Observability -> Workflows.

To trigger it manually:

```bash
curl -X GET "https://<your-domain>/api/workflows/ingest-youtube-videos" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
