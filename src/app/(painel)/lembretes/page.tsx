import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { charges, db, reminders, students } from "@/db";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";

const kindLabels = { before: "Antes do venc.", due: "No vencimento", after: "Após venc." };

export default async function RemindersPage() {
  const list = await db
    .select({ reminder: reminders, charge: charges, student: { id: students.id, name: students.name } })
    .from(reminders)
    .innerJoin(charges, eq(charges.id, reminders.chargeId))
    .innerJoin(students, eq(students.id, charges.studentId))
    .orderBy(desc(reminders.sentAt))
    .limit(200);

  return (
    <>
      <PageHeader
        title="Lembretes de WhatsApp"
        subtitle="Histórico dos últimos 200 envios (automáticos e manuais)"
      >
        <Link href="/configuracoes" className="btn-secondary">Configurar lembretes</Link>
      </PageHeader>
      <div className="card overflow-x-auto p-0">
        {list.length === 0 ? (
          <Empty>Nenhum lembrete enviado ainda.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Enviado em</th>
                <th>Aluno</th>
                <th>Cobrança</th>
                <th>Tipo</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {list.map(({ reminder: r, charge: c, student: s }) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{formatDateTime(r.sentAt)}</td>
                  <td>
                    <Link href={`/alunos/${s.id}`} className="text-indigo-700 hover:underline">{s.name}</Link>
                  </td>
                  <td>
                    {c.description} · {formatMoney(c.amount)} · venc. {formatDate(c.dueDate)}
                  </td>
                  <td>{kindLabels[r.kind]}{r.manual ? " (manual)" : ""}</td>
                  <td>
                    <details>
                      <summary className={`cursor-pointer ${r.success ? "text-emerald-700" : "text-red-600"}`}>
                        {r.success ? "Enviado" : "Falhou"}
                      </summary>
                      <pre className="mt-2 max-w-md text-xs whitespace-pre-wrap text-slate-600">
                        {r.error ? `Erro: ${r.error}\n\n` : ""}
                        {r.message}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
