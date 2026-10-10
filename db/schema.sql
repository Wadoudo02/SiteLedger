-- SiteLedger schema. Idempotent: safe to run repeatedly (npm run db:setup).
-- Money is integer pence. Postcodes are stored normalised (uppercase, no spaces).

-- The user's own company. Its address is the invoice/billing address and is ignored when matching.
create table if not exists company (
  id integer primary key default 1 check (id = 1),
  name text not null,
  address text not null,
  postcode text not null
);

create table if not exists properties (
  id serial primary key,
  name text not null,
  postcode text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('filed', 'needs_review', 'rejected')),
  property_id integer references properties(id),
  supplier text,
  invoice_number text,
  invoice_date date,
  net_pence integer,
  vat_pence integer,
  gross_pence integer,
  category text check (category in ('materials', 'labour', 'other')),
  site_postcode text,
  property_hint text,
  -- Normalised keys for the duplicate check (computed in code, see src/lib/checks.ts).
  supplier_key text,
  invoice_number_key text,
  review_reasons jsonb not null default '[]',
  blob_url text not null,
  blob_pathname text not null,
  original_filename text not null,
  mime_type text not null,
  created_at timestamptz not null default now(),
  filed_at timestamptz,
  -- A filed invoice is always complete.
  constraint filed_is_complete check (
    status <> 'filed' or (
      property_id is not null and supplier is not null and invoice_number is not null
      and invoice_date is not null and net_pence is not null and vat_pence is not null
      and gross_pence is not null and category is not null and filed_at is not null
    )
  )
);

-- Migrations for databases created before these columns existed.
alter table invoices add column if not exists property_hint text;
alter table invoices add column if not exists supplier_key text;
alter table invoices add column if not exists invoice_number_key text;
drop index if exists invoices_filed_supplier_number;

-- Duplicate rule: same invoice number AND (same gross OR same supplier).
-- The check in code searches all non-rejected invoices; these indexes are the safety net for filed ones.
create index if not exists invoices_number_key on invoices (invoice_number_key);
create unique index if not exists invoices_filed_number_gross
  on invoices (invoice_number_key, gross_pence) where status = 'filed';
create unique index if not exists invoices_filed_number_supplier
  on invoices (invoice_number_key, supplier_key) where status = 'filed';

create index if not exists invoices_property_date on invoices (property_id, invoice_date);

-- App-wide daily cap on model calls (counts attempts).
create table if not exists extraction_usage (
  day date primary key,
  count integer not null default 0
);
