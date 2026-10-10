import { Suspense } from "react";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { cardClass, inputClass, labelClass } from "@/components/styles";
import { getCompany } from "@/lib/company";
import { formatPostcode } from "@/lib/postcode";
import { listProperties } from "@/lib/properties";
import { addProperty, deleteProperty, saveCompany } from "./actions";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <CompanySection />
        <PropertiesSection />
      </Suspense>
    </div>
  );
}

async function CompanySection() {
  const company = await getCompany();
  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold">Your company</h2>
      <p className="mb-4 text-sm text-slate-600">
        This is the &ldquo;Invoice to&rdquo; (billing) address on your invoices. It is never used to match a property:
        invoices are filed by their delivery address.
      </p>
      <ActionForm action={saveCompany} className="grid gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          <span>Company name</span>
          <input name="name" defaultValue={company?.name} required className={inputClass} />
        </label>
        <label className={labelClass}>
          <span>Billing address</span>
          <input name="address" defaultValue={company?.address} className={inputClass} />
        </label>
        <label className={labelClass}>
          <span>Postcode</span>
          <input name="postcode" defaultValue={company?.postcode ? formatPostcode(company.postcode) : ""} className={inputClass} />
        </label>
        <div className="sm:col-span-3">
          <SubmitButton>Save company</SubmitButton>
        </div>
      </ActionForm>
    </section>
  );
}

async function PropertiesSection() {
  const properties = await listProperties();
  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold">Properties</h2>
      <p className="mb-4 text-sm text-slate-600">
        Invoices are filed automatically when their delivery postcode matches one of these.
      </p>
      <ul className="mb-6 divide-y divide-slate-200 rounded-md border border-slate-200">
        {properties.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No properties yet.</li>}
        {properties.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-2">
            <span>
              {p.name} <span className="ml-2 font-mono text-sm text-slate-500">{formatPostcode(p.postcode)}</span>
            </span>
            <ActionForm action={deleteProperty} className="flex items-center gap-3">
              <input type="hidden" name="id" value={p.id} />
              <SubmitButton variant="subtle">Remove</SubmitButton>
            </ActionForm>
          </li>
        ))}
      </ul>
      <ActionForm action={addProperty} className="grid gap-3 sm:grid-cols-3">
        <label className={`${labelClass} sm:col-span-2`}>
          <span>Property address</span>
          <input name="name" placeholder="13 Halstead Avenue, Chorlton" required className={inputClass} />
        </label>
        <label className={labelClass}>
          <span>Postcode</span>
          <input name="postcode" placeholder="M21 9FT" required className={inputClass} />
        </label>
        <div className="sm:col-span-3">
          <SubmitButton>Add property</SubmitButton>
        </div>
      </ActionForm>
    </section>
  );
}
