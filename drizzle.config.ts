import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { env as serverEnv } from './data/serverEnv';

export default defineConfig({
  out: './db/migrations',
  schema: './db/schemas.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: serverEnv.DATABASE_URL!,
  },
});
