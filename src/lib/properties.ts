import { db } from "./db";

export type Property = { id: number; name: string; postcode: string };

export async function listProperties(): Promise<Property[]> {
  const sql = await db();
  return (await sql`select id, name, postcode from properties order by name`) as Property[];
}
