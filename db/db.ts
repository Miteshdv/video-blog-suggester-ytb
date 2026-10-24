import { drizzle } from 'drizzle-orm/neon-http';
import { env as serverEnv } from '../data/serverEnv';
import { relations } from './relations';
import { authRelations } from './schemas/better-auth';
 
export const db = drizzle(serverEnv.DATABASE_URL, { relations: { ...relations, ...authRelations } });

