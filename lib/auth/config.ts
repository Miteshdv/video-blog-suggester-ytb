import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/db";
import * as schema from "@/db/schemas";
import { env as serverEnv } from "@/data/serverEnv";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: schema }),
  advanced:{
    database: {
      generateId:"uuid"
    },
  },
  socialProviders: {
    github: {
      clientId: serverEnv.GITHUB_CLIENT_ID,
      clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
    },
  },
  plugins: [nextCookies()],
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL,
});

export type Session = typeof auth.$Infer.Session;