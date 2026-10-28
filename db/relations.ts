import { defineRelations } from 'drizzle-orm';
import * as schema from './schemas';

export const relations = defineRelations(schema, (r) => ({
  user: {
    sessions: r.many.session({ from: r.user.id, to: r.session.userId }),
    accounts: r.many.account({ from: r.user.id, to: r.account.userId }),
  },
  session: {
    user: r.one.user({ from: r.session.userId, to: r.user.id }),
  },
  account: {
    user: r.one.user({ from: r.account.userId, to: r.user.id }),
  },
  content: {
    chunks: r.many.contentChunk({
      from: r.content.id,
      to: r.contentChunk.contentId,
    }),
  },
  contentChunk: {
    content: r.one.content({
      from: r.contentChunk.contentId,
      to: r.content.id,
    }),
  },
}));