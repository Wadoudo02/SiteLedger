"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Upload", match: (p: string) => p === "/" || p.startsWith("/properties") },
  { href: "/review", label: "Needs Review", match: (p: string) => p.startsWith("/review") },
  { href: "/settings", label: "Settings", match: (p: string) => p.startsWith("/settings") },
];

/** Highlights the current page. Reads the URL, so it renders inside <Suspense> (see layout). */
export function NavLinks() {
  return <NavLinkList pathname={usePathname()} />;
}

/** Same links with nothing highlighted: the static fallback while the URL is read. */
export function NavLinkList({ pathname = "" }: { pathname?: string }) {
  return (
    <div className="flex items-center gap-1">
      {LINKS.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-orange-50 text-orange-800" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
