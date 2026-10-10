import { Suspense } from "react";
import { listProperties } from "@/lib/properties";
import { formatPostcode } from "@/lib/postcode";
import { UploadForm } from "./UploadForm";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Upload an invoice</h1>
        <p className="text-slate-600">
          We read the invoice, check the numbers and file it by property and month. Anything that fails a check goes to
          Needs Review.
        </p>
      </section>
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <HomeContent />
      </Suspense>
    </div>
  );
}

async function HomeContent() {
  const properties = await listProperties();
  return (
    <>
      <UploadForm properties={properties.map(({ id, name }) => ({ id, name }))} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Properties</h2>
        {properties.length === 0 ? (
          <p className="text-slate-500">No properties yet. Add them in Settings.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {properties.map((p) => (
              <li key={p.id} className="flex justify-between px-4 py-3">
                <span>{p.name}</span>
                <span className="font-mono text-sm text-slate-500">{formatPostcode(p.postcode)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
