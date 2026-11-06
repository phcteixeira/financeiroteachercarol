import Link from "next/link";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { charges, db, students } from "@/db";
import { addDays, todayISO } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { isCoraConfigured } from "@/lib/cora";
import { isEvolutionConfigured } from "@/lib/evolution";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";

export default async function DashboardPage() {
  const today = todayISO();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [[activeCount], [openTotals], [lateTotals], [paidMonth], upcoming] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(students).where(eq(students.active, true)),
    db
      .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${charges.amount}),0)::int` })
      .from(charges)
      .where(eq(charges.status, "pending")),
    db
      .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${charges.amount}),0)::int` })
      .from(charges)
      .where(eq(charges.status, "late")),
    db
      .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${charges.amount}),0)::int` })
      .from(charges)
      .where(and(eq(charges.status, "paid"), gte(charges.dueDate, monthStart))),
    db
      .select({ charge: charges, student: students })
      .from(charges)
      .innerJoin(students, eq(students.id, charges.studentId))
      .where(and(inArray(charges.status, ["pending", "late"]), lte(charges.dueDate, addDays(today, 15))))
      .orderBy(asc(charges.dueDate))
      .limit(20),
  ]);

  const stats = [
    { label: "Alunos ativos", value: String(activeCount.n), href: "/alunos" },
    { label: `Em aberto (${openTotals.n})`, value: formatMoney(openTotals.total), href: "/cobrancas?status=pending" },
    { label: `Atrasado (${lateTotals.n})`, value: formatMoney(lateTotals.total), href: "/cobrancas?status=late", danger: true },
    { label: `Recebido (venc. no mês)`, value: formatMoney(paidMonth.total), href: "/cobrancas?status=paid" },
  ];

  return (
    <>
      <PageHeader title="Visão geral" subtitle={`Hoje: ${formatDate(today)}`} />

      {(!isCoraConfigured() || !isEvolutionConfigured()) && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {!isCoraConfigured() && <p>⚠️ Integração com a Cora não configurada — boletos não serão emitidos.</p>}
          {!isEvolutionConfigured() && <p>⚠️ Evolution API não configurada — lembretes de WhatsApp não serão enviados.</p>}
          <p className="mt-1">Veja as variáveis de ambiente necessárias no README.</p>
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card hover:border-indigo-300">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${s.danger ? "text-red-600" : ""}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">Vencimentos próximos e atrasados</h2>
        {upcoming.length === 0 ? (
          <Empty>Nenhuma cobrança em aberto para os próximos 15 dias.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(({ charge, student }) => (
                  <tr key={charge.id}>
                    <td>
                      <Link href={`/alunos/${student.id}`} className="text-indigo-700 hover:underline">
                        {student.name}
                      </Link>
                    </td>
                    <td>{charge.description}</td>
                    <td>{formatDate(charge.dueDate)}</td>
                    <td>{formatMoney(charge.amount)}</td>
                    <td><StatusBadge status={charge.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
