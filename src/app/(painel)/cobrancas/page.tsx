import Link from "next/link";
import { and, asc, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { charges, db, students } from "@/db";
import { todayISO, dueDateFor } from "@/lib/dates";
import { formatDate, formatMoney, statusLabels } from "@/lib/format";
import { toStudentOption } from "@/lib/student-options";
import { ChargeActions } from "@/components/charge-actions";
import { ChargeForm } from "@/components/charge-form";
import { GenerateMonthForm, SyncAllButton } from "@/components/bulk-actions";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";
import { FilterForm } from "@/components/filter-form";

const statuses = ["pending", "late", "paid", "canceled", "error"] as const;
type Status = (typeof statuses)[number];

export default async function ChargesPage({ searchParams }: PageProps<"/cobrancas">) {
  const sp = await searchParams;
  const status = statuses.includes(sp.status as Status) ? (sp.status as Status) : undefined;
  const month = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : "";

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(charges.status, status));
  if (month) {
    const [y, m] = month.split("-").map(Number);
    conditions.push(gte(charges.dueDate, `${month}-01`), lte(charges.dueDate, dueDateFor(y, m, 31)));
  }

  const [list, activeStudents] = await Promise.all([
    db
      .select({ charge: charges, student: { id: students.id, name: students.name } })
      .from(charges)
      .innerJoin(students, eq(students.id, charges.studentId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(charges.dueDate), asc(students.name))
      .limit(300),
    db.select().from(students).where(eq(students.active, true)).orderBy(asc(students.name)),
  ]);

  const total = list.reduce((sum, r) => sum + r.charge.amount, 0);
  const [y, m] = todayISO().split("-").map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  return (
    <>
      <PageHeader title="Cobranças" subtitle="Boletos e Pix emitidos pela Cora">
        <SyncAllButton />
      </PageHeader>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold">Nova cobrança avulsa</h2>
          <ChargeForm students={activeStudents.map(toStudentOption)} />
        </section>
        <section className="card">
          <h2 className="mb-1 font-semibold">Mensalidades em lote</h2>
          <p className="mb-3 text-sm text-slate-500">
            Cria um boleto para cada aluno ativo usando o valor e o dia de vencimento cadastrados. Alunos que
            já têm cobrança do mês são ignorados.
          </p>
          <GenerateMonthForm defaultMonth={nextMonth} />
        </section>
      </div>

      <FilterForm
        extra={
          <>
            <Link href="/cobrancas" className="btn-secondary">
              Limpar
            </Link>
            <p className="ml-auto text-sm text-slate-500">
              {list.length} cobrança(s) · {formatMoney(total)}
            </p>
          </>
        }
        results={
          <div className="card overflow-x-auto p-0">
            {list.length === 0 ? (
              <Empty>Nenhuma cobrança encontrada.</Empty>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Descrição</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ charge, student }) => (
                    <tr key={charge.id}>
                      <td>
                        <Link href={`/alunos/${student.id}`} className="text-indigo-700 hover:underline">
                          {student.name}
                        </Link>
                      </td>
                      <td>
                        {charge.description}
                        {charge.errorMessage && charge.status === "error" && (
                          <p className="max-w-xs text-xs text-red-600">{charge.errorMessage}</p>
                        )}
                      </td>
                      <td>{formatDate(charge.dueDate)}</td>
                      <td>{formatMoney(charge.amount)}</td>
                      <td>
                        <StatusBadge status={charge.status} />
                      </td>
                      <td>
                        <ChargeActions charge={charge} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        }
      >
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={status ?? ""} className="input w-auto">
            <option value="">Todos</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="mes">
            Mês do vencimento
          </label>
          <input id="mes" name="mes" type="month" defaultValue={month} className="input w-auto" />
        </div>
      </FilterForm>
    </>
  );
}
