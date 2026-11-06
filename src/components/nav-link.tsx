"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Spinner } from "./spinner";

/** Mostra um indicador enquanto a página do link clicado carrega. */
function PendingHint() {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className="h-3.5 w-3.5 text-indigo-500" /> : null;
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm ${
        active ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
      <PendingHint />
    </Link>
  );
}
