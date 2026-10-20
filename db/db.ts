import { drizzle } from 'drizzle-orm/neon-http';
import { env as serverEnv } from '../data/serverEnv';
import { relations } from './relations';
 
const db = drizzle(serverEnv.DATABASE_URL,{relations});

