import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { connection } from "next/server";

let client: NeonQueryFunction<false, false> | undefined;

/**
 * Returns the SQL client. Awaiting connection() first means every DB read
 * happens at request time, so figures are never served from a prerender.
 */
export async function db() {
  await connection();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  client ??= neon(process.env.DATABASE_URL);
  return client;
}
