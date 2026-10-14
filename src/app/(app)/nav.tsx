"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Snapshot" },
  { href: "/ledger", label: "Ledger" },
  { href: "/prices", label: "Prices" },
  { href: "/import", label: "Import" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-5 overflow-x-auto text-sm -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`py-3 border-b-2 whitespace-nowrap ${active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
