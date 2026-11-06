"use client";

import { useActionState } from "react";
import { saveSettingsAction, testWhatsAppAction } from "@/app/(painel)/actions";
import type { AppSettings } from "@/lib/settings";
import { FormMessage } from "./ui";

export function SettingsForm({ settings, variables }: { settings: AppSettings; variables: string[] }) {
  const [state, action, pending] = useActionState(saveSettingsAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <section className="card space-y-4">
        <h2 className="font-semibold">Lembretes automáticos (WhatsApp)</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remindersEnabled" defaultChecked={settings.remindersEnabled} />
          Enviar lembretes automaticamente (rotina diária, por volta das 9h)
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="daysBefore">Dias antes do vencimento</label>
            <input id="daysBefore" name="daysBefore" type="number" min={0} max={30} defaultValue={settings.daysBefore} className="input" />
            <p className="mt-1 text-xs text-slate-500">0 = não enviar</p>
          </div>
          <label className="flex items-center gap-2 self-center text-sm">
            <input type="checkbox" name="remindOnDueDate" defaultChecked={settings.remindOnDueDate} />
            Lembrar no dia do vencimento
          </label>
          <div>
            <label className="label" htmlFor="daysAfter">Dias após o vencimento</label>
            <input id="daysAfter" name="daysAfter" defaultValue={settings.daysAfter.join(", ")} className="input" placeholder="1, 5, 10" />
            <p className="mt-1 text-xs text-slate-500">Separe por vírgula</p>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Mensagens</h2>
        <p className="text-sm text-slate-500">
          Variáveis disponíveis: {variables.map((v) => <code key={v} className="mr-1 rounded bg-slate-100 px-1">{v}</code>)}
        </p>
        <div>
          <label className="label" htmlFor="templateBefore">Antes do vencimento</label>
          <textarea id="templateBefore" name="templateBefore" rows={6} defaultValue={settings.templateBefore} className="input font-mono" />
        </div>
        <div>
          <label className="label" htmlFor="templateDue">No dia do vencimento</label>
          <textarea id="templateDue" name="templateDue" rows={6} defaultValue={settings.templateDue} className="input font-mono" />
        </div>
        <div>
          <label className="label" htmlFor="templateAfter">Após o vencimento (atraso)</label>
          <textarea id="templateAfter" name="templateAfter" rows={6} defaultValue={settings.templateAfter} className="input font-mono" />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Boletos (Cora)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="label" htmlFor="serviceName">Nome do serviço no boleto</label>
            <input id="serviceName" name="serviceName" defaultValue={settings.serviceName} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="finePercent">Multa por atraso (%)</label>
            <input id="finePercent" name="finePercent" inputMode="decimal" defaultValue={settings.finePercent} className="input" />
            <p className="mt-1 text-xs text-slate-500">Máximo legal: 2%</p>
          </div>
          <div>
            <label className="label" htmlFor="interestPercent">Juros ao mês (%)</label>
            <input id="interestPercent" name="interestPercent" inputMode="decimal" defaultValue={settings.interestPercent} className="input" />
            <p className="mt-1 text-xs text-slate-500">Máximo legal: 1%</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="autoGenerate" defaultChecked={settings.autoGenerate} />
          Gerar mensalidades automaticamente
        </label>
        <div className="max-w-xs">
          <label className="label" htmlFor="generateDaysBefore">Gerar o boleto quantos dias antes do vencimento</label>
          <input id="generateDaysBefore" name="generateDaysBefore" type="number" min={1} max={30} defaultValue={settings.generateDaysBefore} className="input" />
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <FormMessage state={state} />
        <button className="btn-primary" disabled={pending}>{pending ? "Salvando..." : "Salvar configurações"}</button>
      </div>
    </form>
  );
}

export function TestWhatsAppForm() {
  const [state, action, pending] = useActionState(testWhatsAppAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label" htmlFor="testPhone">Enviar mensagem de teste para</label>
        <input id="testPhone" name="phone" placeholder="(11) 99999-9999" className="input" required />
      </div>
      <button className="btn-secondary" disabled={pending}>{pending ? "Enviando..." : "Testar"}</button>
      <div className="w-full"><FormMessage state={state} /></div>
    </form>
  );
}
