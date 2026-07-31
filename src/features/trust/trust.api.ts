import {
  trustControllerBlock,
  trustControllerBlocks,
  trustControllerReport,
  trustControllerUnblock,
} from '@/generated/api/sdk.gen';
import type { BlockPage, CreateReportDto } from '@/generated/api/types.gen';
import { unwrap } from '@/services/api/result';

export const trustApi = {
  async blocks(cursor?: string, signal?: AbortSignal) {
    const page: BlockPage = unwrap(
      await trustControllerBlocks({ query: { cursor, limit: 20 }, signal }),
    );
    return { items: page.items, nextCursor: page.nextCursor ?? undefined };
  },
  async block(blockedUserId: string, reason: string, idempotencyKey: string) {
    return unwrap(
      await trustControllerBlock({
        headers: { 'Idempotency-Key': idempotencyKey },
        body: { blockedUserId, reason: reason || undefined },
      }),
    );
  },
  async unblock(blockedUserId: string) {
    return unwrap(await trustControllerUnblock({ path: { blockedUserId } }));
  },
  async report(input: CreateReportDto, idempotencyKey: string) {
    return unwrap(
      await trustControllerReport({
        headers: { 'Idempotency-Key': idempotencyKey },
        body: input,
      }),
    );
  },
};
