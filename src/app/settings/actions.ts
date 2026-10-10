"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/components/ActionForm";
import { db } from "@/lib/db";
import { formatPostcode, isValidPostcode, normalisePostcode } from "@/lib/postcode";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveCompany(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  const address = text(formData, "address");
  const postcode = normalisePostcode(text(formData, "postcode"));
  if (!name) return { ok: false, message: "Enter your company name." };
  if (postcode && !isValidPostcode(postcode)) return { ok: false, message: "That doesn't look like a UK postcode." };

  const sql = await db();
  await sql`
    insert into company (id, name, address, postcode) values (1, ${name}, ${address}, ${postcode})
    on conflict (id) do update set name = excluded.name, address = excluded.address, postcode = excluded.postcode`;
  refresh();
  return { ok: true, message: "Company details saved." };
}

export async function addProperty(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  const postcode = normalisePostcode(text(formData, "postcode"));
  if (!name) return { ok: false, message: "Enter the property address." };
  if (!isValidPostcode(postcode)) return { ok: false, message: "Enter a valid UK postcode, e.g. M21 9FT." };

  const sql = await db();
  const rows = await sql`
    insert into properties (name, postcode) values (${name}, ${postcode})
    on conflict (postcode) do nothing returning id`;
  if (rows.length === 0) {
    return { ok: false, message: `A property with postcode ${formatPostcode(postcode)} already exists.` };
  }
  refresh();
  return { ok: true, message: `Added ${name}.` };
}

export async function deleteProperty(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = Number(formData.get("id"));
  const sql = await db();
  const [{ count }] = await sql`select count(*)::int as count from invoices where property_id = ${id}`;
  if (count > 0) {
    return { ok: false, message: `This property has ${count} invoice(s), so it can't be removed.` };
  }
  await sql`delete from properties where id = ${id}`;
  refresh();
  return { ok: true, message: "Property removed." };
}
