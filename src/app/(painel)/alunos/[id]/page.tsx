import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { charges, contracts, db, reminders, students } from "@/db";
import { formatDate, formatDateTime, formatDocument, formatMoney, formatPhone } from "@/lib/format";
import { isUuid } from "@/lib/validation";
import { toStudentOption } from "@/lib/student-options";
import { StudentForm } from "@/components/student-form";
import { ContractUploader } from "@/components/contract-uploader";
import { ChargeActions } from "@/components/charge-actions";
import { ChargeForm } from "@/components/charge-form";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";
import { deleteContract, deleteStudent, updateStudent } from "../../actions";
import { ConfirmButton } from "@/components/confirm-button";

const kindLabels = { before: "Antes do venc.", due: "No vencimento", after: "Após venc." };

export default async function StudentPage({ params }: PageProps<"/alunos/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const student = await db.query.students.findFirst({ where: eq(students.id, id) });
  if (!student) notFound();

  const [files, chargeList] = await Promise.all([
    db.select().from(contracts).where(eq(contracts.studentId, id)).orderBy(desc(contracts.uploadedAt)),
    db.select().from(charges).where(eq(charges.studentId, id)).orderBy(desc(charges.dueDate)),
  ]);
  const history = chargeList.length
    ? await db
        .select()
        .from(reminders)
        .where(inArray(reminders.chargeId, chargeList.map((c) => c.id)))
        .orderBy(desc(reminders.sentAt))
        .limit(30)
    : [];

  return (
    <>
      <PageHeader
        title={student.name}
        subtitle={`${formatPhone(student.phone)} · CPF/CNPJ ${formatDocument(student.document)} · ${formatMoney(student.monthlyFee)} todo dia ${student.dueDay}`}
      >
        <Link href="/alunos" className="btn-secondary">Voltar</Link>
        <form action={deleteStudent.bind(null, student.id)}>
          <ConfirmButton
            className="btn-danger"
            message="Excluir este aluno, seus contratos e histórico de cobranças? Boletos em aberto na Cora NÃO serão cancelados automaticamente."
          >
            Excluir aluno
          </ConfirmButton>
        </form>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-4 font-semibold">Dados do aluno</h2>
          <StudentForm action={updateStudent.bind(null, student.id)} student={student} />
        </section>

        <section className="card">
          <h2 className="mb-4 font-semibold">Contratos (PDF)</h2>
          <ContractUploader studentId={student.id} />
          <ul className="mt-4 divide-y divide-slate-100">
            {files.length === 0 && <Empty>Nenhum contrato anexado.</Empty>}
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <a
                    href={`/api/contratos/${f.id}`}
                    target="_blank"
                    className="block truncate text-indigo-700 hover:underline"
                  >
                    📄 {f.fileName}
                  </a>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(f.uploadedAt)} · {(f.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                <form action={deleteContract.bind(null, f.id)}>
                  <ConfirmButton className="btn-secondary btn-sm" message="Excluir este contrato?">
                    Excluir
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card mt-6">
        <h2 className="mb-4 font-semibold">Nova cobrança</h2>
        <ChargeForm students={[toStudentOption(student)]} fixed />
      </section>

      <section className="card mt-6 overflow-x-auto">
        <h2 className="mb-4 font-semibold">Cobranças</h2>
        {chargeList.length === 0 ? (
          <Empty>Nenhuma cobrança.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {chargeList.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.description}
                    {c.errorMessage && <p className="text-xs text-red-600">{c.errorMessage}</p>}
                  </td>
                  <td>{formatDate(c.dueDate)}</td>
                  <td>{formatMoney(c.amount)}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td><ChargeActions charge={c} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card mt-6 overflow-x-auto">
        <h2 className="mb-4 font-semibold">Lembretes enviados</h2>
        {history.length === 0 ? (
          <Empty>Nenhum lembrete enviado ainda.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.sentAt)}</td>
                  <td>{kindLabels[r.kind]}{r.manual ? " (manual)" : ""}</td>
                  <td>
                    {r.success ? (
                      <span className="text-emerald-700">Enviado</span>
                    ) : (
                      <span className="text-red-600" title={r.error ?? ""}>Falhou: {r.error?.slice(0, 80)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
