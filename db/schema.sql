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

-- Safety net behind the duplicate check in code.
create unique index if not exists invoices_filed_supplier_number
  on invoices (lower(supplier), lower(invoice_number)) where status = 'filed';

create index if not exists invoices_property_date on invoices (property_id, invoice_date);

-- App-wide daily cap on model calls (counts attempts).
create table if not exists extraction_usage (
  day date primary key,
  count integer not null default 0
);
