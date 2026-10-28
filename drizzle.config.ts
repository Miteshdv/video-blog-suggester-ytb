import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Read DATABASE_URL directly instead of importing data/serverEnv: migrations
// only need the database, and validating the full app env here would make
// `db:migrate` fail on unrelated variables (e.g. OPENAI_API_KEY) in CI/builds.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

export default defineConfig({
  out: './db/migrations',
  schema: './db/schemas.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
