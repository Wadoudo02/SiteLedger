import { connection } from "next/server";

/** Reports which settings are present (true/false only; never values). */
export async function GET() {
  await connection();
  return Response.json({
    database: Boolean(process.env.DATABASE_URL),
    blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    anthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    extractor: process.env.EXTRACTOR === "mock" ? "mock" : "claude",
  });
}
