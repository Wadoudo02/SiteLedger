import Link from "next/link";
import { Suspense } from "react";
import { cardClass } from "@/components/styles";
import { listProperties } from "@/lib/properties";
import { formatPostcode } from "@/lib/postcode";
import { UploadForm } from "./UploadForm";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <p className="text-sm font-semibold tracking-wide text-orange-700 uppercase">Invoices, filed for you</p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Snap a receipt. We check the numbers and file it by property and month.
        </h1>
        <p className="max-w-2xl text-stone-600">
          Clean invoices file automatically. Anything that fails a check (wrong VAT, a duplicate, an unknown site) waits
          in Needs Review for a quick human look.
        </p>
      </section>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
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
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your properties</h2>
        {properties.length === 0 ? (
          <p className="text-stone-500">
            No properties yet.{" "}
            <Link href="/settings" className="font-medium text-orange-700 hover:underline">
              Add them in Settings
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/properties/${p.id}`}
                  className={`${cardClass} group flex h-full flex-col justify-between gap-4 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md`}
                >
                  <span className="font-medium text-stone-900">{p.name}</span>
                  <span className="flex items-center justify-between text-sm">
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-stone-600">
                      {formatPostcode(p.postcode)}
                    </span>
                    <span className="font-medium text-orange-700 group-hover:underline">View dashboard →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
