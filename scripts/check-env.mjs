// Checks that Postgres, Blob and Anthropic credentials work.
// Usage: node --env-file=.env scripts/check-env.mjs
// Prints pass/fail only; never prints secret values.
import { neon } from "@neondatabase/serverless";
import { put, del } from "@vercel/blob";
import Anthropic from "@anthropic-ai/sdk";

async function check(name, fn) {
  try {
    const detail = await fn();
    console.log(`PASS ${name}${detail ? ` (${detail})` : ""}`);
  } catch (err) {
    console.log(`FAIL ${name}: ${err?.constructor?.name ?? "Error"} ${err?.status ?? ""}`.trim());
    process.exitCode = 1;
  }
}

await check("Postgres", async () => {
  const sql = neon(process.env.DATABASE_URL);
  const [row] = await sql`select current_setting('server_version') as v`;
  return `server ${row.v}`;
});

await check("Blob", async () => {
  const blob = await put("healthcheck/ping.txt", "ok", { access: "public", addRandomSuffix: true });
  await del(blob.url);
  return "wrote and deleted a test file";
});

await check("Anthropic", async () => {
  const client = new Anthropic();
  const page = await client.models.list({ limit: 20 });
  return page.data.map((m) => m.id).join(", ");
});
