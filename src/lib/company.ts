import { db } from "./db";

export type Company = { name: string; address: string; postcode: string };

export async function getCompany(): Promise<Company | null> {
  const sql = await db();
  const [row] = await sql`select name, address, postcode from company where id = 1`;
  return (row as Company | undefined) ?? null;
}
