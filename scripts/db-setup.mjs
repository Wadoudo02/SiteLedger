// Applies db/schema.sql and seeds demo data. Idempotent.
// Usage: npm run db:setup
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const statements = schema
  .split(/;\s*$/m)
  .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
  .filter(Boolean);
for (const statement of statements) {
  await sql.query(statement);
}
console.log(`Applied ${statements.length} schema statements.`);

// Fictional demo data. Postcodes are stored normalised (uppercase, no spaces).
await sql`
  insert into company (id, name, address, postcode)
  values (1, 'Harbour Lane Lettings Ltd', 'Unit 4, 20 Harbour Lane, Bristol', 'BS14QD')
  on conflict (id) do nothing`;

const properties = [
  ["12 Larch Avenue, Bristol", "BS65QA"],
  ["Flat 3, 41 Mill Lane, Leeds", "LS62EX"],
  ["7 Quarry Row, Sheffield", "S101TJ"],
];
for (const [name, postcode] of properties) {
  await sql`insert into properties (name, postcode) values (${name}, ${postcode}) on conflict (postcode) do nothing`;
}

const [{ count }] = await sql`select count(*)::int as count from properties`;
console.log(`Seeded company and properties (${count} properties in total).`);
