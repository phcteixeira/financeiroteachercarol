import Link from "next/link";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db, students } from "@/db";
import { formatMoney, formatPhone } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";
import { FilterForm } from "@/components/filter-form";

export default async function StudentsPage({ searchParams }: PageProps<"/alunos">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = typeof sp.filtro === "string" ? sp.filtro : "ativos";

  const conditions = [];
  if (q)
    conditions.push(
      or(ilike(students.name, `%${q}%`), ilike(students.phone, `%${q.replace(/\D/g, "") || q}%`)),
    );
  if (filter === "ativos") conditions.push(eq(students.active, true));
  if (filter === "inativos") conditions.push(eq(students.active, false));

  const list = await db
    .select()
    .from(students)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(students.name));

  return (
    <>
      <PageHeader title="Alunos" subtitle={`${list.length} aluno(s)`}>
        <Link href="/alunos/novo" className="btn-primary">
          + Novo aluno
        </Link>
      </PageHeader>

      <FilterForm
        results={
          <div className="card overflow-x-auto p-0">
            {list.length === 0 ? (
              <Empty>Nenhum aluno encontrado.</Empty>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Mensalidade</th>
                    <th>Vencimento</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td>
                        <Link
                          href={`/alunos/${s.id}`}
                          className="font-medium text-indigo-700 hover:underline"
                        >
                          {s.name}
                        </Link>
                        {!s.document && <span className="ml-2 text-xs text-amber-600">sem CPF</span>}
                      </td>
                      <td>{formatPhone(s.phone)}</td>
                      <td>{formatMoney(s.monthlyFee)}</td>
                      <td>Dia {s.dueDay}</td>
                      <td>{s.active ? "Ativo" : <span className="text-slate-400">Inativo</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        }
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou telefone"
          className="input max-w-xs"
        />
        <select name="filtro" defaultValue={filter} className="input w-auto">
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </select>
      </FilterForm>
    </>
  );
}
