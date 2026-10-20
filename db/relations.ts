import { defineRelations } from 'drizzle-orm';
import * as schema from './schemas'
export const   relations = defineRelations(schema)