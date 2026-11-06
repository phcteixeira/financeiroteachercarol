"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/configuracoes", label: "Lembretes e boletos" },
  { href: "/configuracoes/integracoes", label: "Integrações (Cora e WhatsApp)" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 border-b border-slate-200">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              active
                ? "border-indigo-600 font-medium text-indigo-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
