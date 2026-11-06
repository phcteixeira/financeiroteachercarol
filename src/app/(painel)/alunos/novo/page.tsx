import Link from "next/link";
import { StudentForm } from "@/components/student-form";
import { PageHeader } from "@/components/ui";
import { createStudent } from "../../actions";

export default function NewStudentPage() {
  return (
    <>
      <PageHeader title="Novo aluno">
        <Link href="/alunos" className="btn-secondary">Voltar</Link>
      </PageHeader>
      <div className="card max-w-3xl">
        <StudentForm action={createStudent} />
      </div>
      <p className="mt-3 text-sm text-slate-500">Depois de salvar, você poderá anexar contratos em PDF.</p>
    </>
  );
}
