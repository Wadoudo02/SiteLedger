import { Suspense } from "react";
import { listProperties } from "@/lib/properties";
import { formatPostcode } from "@/lib/postcode";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">SiteLedger</h1>
        <p className="text-slate-600">
          Upload building invoices. We read them, check the numbers and file them by property and month.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Properties</h2>
        <Suspense fallback={<p className="text-slate-500">Loading properties…</p>}>
          <PropertyList />
        </Suspense>
      </section>
    </div>
  );
}

async function PropertyList() {
  const properties = await listProperties();
  if (properties.length === 0) {
    return <p className="text-slate-500">No properties yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {properties.map((p) => (
        <li key={p.id} className="flex justify-between px-4 py-3">
          <span>{p.name}</span>
          <span className="font-mono text-sm text-slate-500">{formatPostcode(p.postcode)}</span>
        </li>
      ))}
    </ul>
  );
}
