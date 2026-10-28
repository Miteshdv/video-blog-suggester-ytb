import { sleep } from "workflow";

export type BatchFailure<T> = {
  item: T;
  reason: string;
};

export type BatchExecResult<T, R> = {
  total: number;
  succeeded: R[];
  failures: BatchFailure<T>[];
};

type BatchExecOptions = {
  batchSize?: number;
  delayMs?: number;
};

/**
 * Runs `fn` over `items` in sequential batches, letting each batch settle
 * before starting the next one. A rejected item never aborts the remaining
 * work; its failure is reported alongside the successful results.
 */
export async function batchExec<T, R>(
  items: readonly T[],
  fn: (item: T) => Promise<R>,
  { batchSize = 10, delayMs = 0 }: BatchExecOptions = {},
): Promise<BatchExecResult<T, R>> {
  const succeeded: R[] = [];
  const failures: BatchFailure<T>[] = [];

  for (let offset = 0; offset < items.length; offset += batchSize) {
    const batch = items.slice(offset, offset + batchSize);
    const outcomes = await Promise.allSettled(batch.map((item) => fn(item)));

    outcomes.forEach((outcome, index) => {
      if (outcome.status === "fulfilled") {
        succeeded.push(outcome.value);
        return;
      }

      failures.push({
        item: batch[index],
        reason:
          outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason),
      });
    });

    if (delayMs > 0 && offset + batchSize < items.length) {
      await sleep(delayMs);
    }
  }

  return { total: items.length, succeeded, failures };
}
