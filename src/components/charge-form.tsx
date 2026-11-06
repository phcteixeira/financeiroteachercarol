"use client";

import { useActionState, useState } from "react";
import { createChargeAction } from "@/app/(painel)/actions";
import { centsToInput } from "@/lib/format";
import { FormMessage } from "./ui";

interface StudentOption {
  id: string;
  name: string;
  monthlyFee: number;
  nextDueDate: string;
  description: string;
}

export function ChargeForm({ students, fixed }: { students: StudentOption[]; fixed?: boolean }) {
  const [state, action, pending] = useActionState(createChargeAction, undefined);
  const [selected, setSelected] = useState<StudentOption | undefined>(fixed ? students[0] : undefined);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4" key={selected?.id ?? "none"}>
      {fixed ? (
        <input type="hidden" name="studentId" value={selected?.id} />
      ) : (
        <div className="sm:col-span-4">
          <label className="label" htmlFor="studentId">Aluno *</label>
          <select
            id="studentId"
            name="studentId"
            required
            className="input"
            value={selected?.id ?? ""}
            onChange={(e) => setSelected(students.find((s) => s.id === e.target.value))}
          >
            <option value="" disabled>Selecione...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="description">Descrição *</label>
        <input id="description" name="description" required maxLength={100} defaultValue={selected?.description} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="amount">Valor (R$) *</label>
        <input
          id="amount"
          name="amount"
          required
          inputMode="decimal"
          defaultValue={selected ? centsToInput(selected.monthlyFee) : ""}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="dueDate">Vencimento *</label>
        <input id="dueDate" name="dueDate" type="date" required defaultValue={selected?.nextDueDate} className="input" />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-4">
        <FormMessage state={state} />
        <button className="btn-primary" disabled={pending}>
          {pending ? "Emitindo boleto..." : "Criar cobrança (boleto + Pix)"}
        </button>
      </div>
    </form>
  );
}
