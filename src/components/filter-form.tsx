"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Spinner } from "./spinner";

/**
 * Formulário de filtros (GET) com navegação no cliente: mostra "Filtrando..."
 * e esmaece os resultados enquanto a nova lista carrega.
 */
export function FilterForm({
  children,
  results,
  extra,
  className = "mb-4 flex flex-wrap items-end gap-2",
}: {
  children: React.ReactNode;
  results: React.ReactNode;
  /** Conteúdo exibido depois do botão "Filtrar" (ex: link "Limpar", totais). */
  extra?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <form
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const params = new URLSearchParams();
          for (const [k, v] of new FormData(e.currentTarget)) if (typeof v === "string" && v) params.set(k, v);
          const qs = params.toString();
          startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
        }}
      >
        {children}
        <button className="btn-secondary" disabled={pending}>
          {pending ? (
            <>
              <Spinner /> Filtrando...
            </>
          ) : (
            "Filtrar"
          )}
        </button>
        {extra}
      </form>
      <div aria-busy={pending} className={`transition-opacity ${pending ? "pointer-events-none opacity-50" : ""}`}>
        {results}
      </div>
    </>
  );
}
