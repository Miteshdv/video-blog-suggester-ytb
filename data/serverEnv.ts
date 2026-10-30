import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
   
    CRON_SECRET: z.string().min(1).optional(),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
    RATE_LIMIT_WINDOW_HOURS: z.coerce.number().int().positive().default(1),
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_EMBEDDING_MODEL: z
      .enum(["text-embedding-3-small", "text-embedding-3-large"])
      .default("text-embedding-3-small"),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_REFRESH_TOKEN: z.string().min(1).optional(),
  },

  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  
});