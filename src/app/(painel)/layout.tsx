import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { logout } from "../login/actions";
import { NavLink } from "@/components/nav-link";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: LayoutProps<"/">) {
  await requireAuth();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:w-60 md:border-r md:border-b-0">
        <div className="p-4">
          <Link href="/" className="text-lg font-semibold text-indigo-700">
            Teacher Carol
          </Link>
          <p className="text-xs text-slate-500">Financeiro</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col">
          <NavLink href="/">Início</NavLink>
          <NavLink href="/alunos">Alunos</NavLink>
          <NavLink href="/cobrancas">Cobranças</NavLink>
          <NavLink href="/lembretes">Lembretes</NavLink>
          <NavLink href="/configuracoes">Configurações</NavLink>
          <form action={logout}>
            <button className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100">
              Sair
            </button>
          </form>
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
