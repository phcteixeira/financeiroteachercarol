"use client";

import { useActionState } from "react";
import type { Student } from "@/db/schema";
import { centsToInput, formatDocument, formatPhone } from "@/lib/format";
import type { ActionState } from "@/lib/validation";
import { FormMessage } from "./ui";

export function StudentForm({
  action,
  student,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  student?: Student;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="name">Nome completo *</label>
        <input id="name" name="name" required defaultValue={student?.name} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="phone">Telefone (WhatsApp) *</label>
        <input
          id="phone"
          name="phone"
          required
          placeholder="(11) 99999-9999"
          defaultValue={student ? formatPhone(student.phone) : ""}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="document">CPF/CNPJ (do responsável financeiro)</label>
        <input
          id="document"
          name="document"
          placeholder="000.000.000-00"
          defaultValue={student?.document ? formatDocument(student.document) : ""}
          className="input"
        />
        <p className="mt-1 text-xs text-slate-500">Obrigatório para emitir boleto na Cora.</p>
      </div>
      <div>
        <label className="label" htmlFor="monthlyFee">Valor da mensalidade (R$) *</label>
        <input
          id="monthlyFee"
          name="monthlyFee"
          required
          inputMode="decimal"
          placeholder="350,00"
          defaultValue={student ? centsToInput(student.monthlyFee) : ""}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="dueDay">Dia do vencimento *</label>
        <input
          id="dueDay"
          name="dueDay"
          type="number"
          min={1}
          max={31}
          required
          defaultValue={student?.dueDay ?? 10}
          className="input"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" defaultValue={student?.email ?? ""} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">Observações</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={student?.notes ?? ""} className="input" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={student?.active ?? true} />
        Aluno ativo (recebe cobranças e lembretes)
      </label>
      <div className="flex items-center justify-end gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <button className="btn-primary" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
