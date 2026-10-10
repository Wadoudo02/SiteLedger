import { db } from "./db";
import { todayInLondon } from "./dates";

export const DAILY_EXTRACTION_LIMIT = 100;

/**
 * Atomically counts one extraction attempt against today's app-wide cap.
 * Returns false (and counts nothing) once the cap is reached.
 */
export async function consumeExtractionQuota(): Promise<boolean> {
  const sql = await db();
  const rows = await sql`
    insert into extraction_usage (day, count) values (${todayInLondon()}, 1)
    on conflict (day) do update set count = extraction_usage.count + 1
      where extraction_usage.count < ${DAILY_EXTRACTION_LIMIT}
    returning count`;
  return rows.length > 0;
}
