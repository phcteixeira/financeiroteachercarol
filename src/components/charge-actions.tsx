"use client";

import { useActionState, useState } from "react";
import { chargeAction } from "@/app/(painel)/actions";
import type { Charge } from "@/db/schema";

export function CopyButton({ text, label = "Copiar Pix" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary btn-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copiado!" : label}
    </button>
  );
}

const confirmations: Record<string, string> = {
  cancel: "Cancelar esta cobrança? O boleto será cancelado na Cora.",
  delete: "Excluir esta cobrança do painel?",
  paid: "Marcar como paga manualmente (pagamento fora da Cora)?",
  remind: "Enviar lembrete pelo WhatsApp agora?",
};

function OpButton({
  op,
  label,
  danger,
  pending,
}: {
  op: string;
  label: string;
  danger?: boolean;
  pending: boolean;
}) {
  return (
    <button
      name="op"
      value={op}
      disabled={pending}
      className={`${danger ? "btn-danger" : "btn-secondary"} btn-sm`}
      onClick={(e) => {
        if (confirmations[op] && !confirm(confirmations[op])) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}

export function ChargeActions({ charge }: { charge: Charge }) {
  const [state, action, pending] = useActionState(chargeAction, undefined);
  const open = charge.status === "pending" || charge.status === "late";

  return (
    <form action={action} className="flex flex-wrap items-center gap-1">
      <input type="hidden" name="id" value={charge.id} />
      {charge.boletoUrl && (
        <a href={charge.boletoUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
          Boleto
        </a>
      )}
      {charge.pixCode && <CopyButton text={charge.pixCode} />}
      {open && <OpButton pending={pending} op="remind" label="Lembrar" />}
      {open && charge.coraInvoiceId && <OpButton pending={pending} op="sync" label="Atualizar" />}
      {charge.status === "error" && <OpButton pending={pending} op="retry" label="Tentar de novo" />}
      {open && <OpButton pending={pending} op="paid" label="Marcar paga" />}
      {(open || charge.status === "error") && charge.coraInvoiceId && <OpButton pending={pending} op="cancel" label="Cancelar" danger />}
      {(!charge.coraInvoiceId || charge.status === "canceled") && <OpButton pending={pending} op="delete" label="Excluir" danger />}
      {pending && <span className="text-xs text-slate-500">...</span>}
      {state?.error && <span className="w-full text-xs text-red-600">{state.error}</span>}
      {state?.ok && <span className="w-full text-xs text-emerald-700">{state.ok}</span>}
    </form>
  );
}
