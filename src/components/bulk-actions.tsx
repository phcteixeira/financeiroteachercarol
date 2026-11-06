"use client";

import { useActionState } from "react";
import { generateMonthAction, syncAllAction } from "@/app/(painel)/actions";
import { FormMessage } from "./ui";

export function GenerateMonthForm({ defaultMonth }: { defaultMonth: string }) {
  const [state, action, pending] = useActionState(generateMonthAction, undefined);
  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        if (!confirm("Gerar boletos na Cora para todos os alunos ativos que ainda não têm cobrança neste mês?")) {
          e.preventDefault();
        }
      }}
    >
      <div>
        <label className="label" htmlFor="month">Mês de referência</label>
        <input id="month" name="month" type="month" required defaultValue={defaultMonth} className="input" />
      </div>
      <button className="btn-primary" disabled={pending}>
        {pending ? "Gerando..." : "Gerar mensalidades do mês"}
      </button>
      <div className="w-full"><FormMessage state={state} /></div>
    </form>
  );
}

export function SyncAllButton() {
  const [state, action, pending] = useActionState(syncAllAction, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button className="btn-secondary" disabled={pending}>
        {pending ? "Sincronizando..." : "Sincronizar com a Cora"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
