import { headers } from "next/headers";
import { getSettings, templateVariables } from "@/lib/settings";
import { isCoraConfigured } from "@/lib/cora";
import { getConnectionState, isEvolutionConfigured } from "@/lib/evolution";
import { SettingsForm, TestWhatsAppForm } from "@/components/settings-form";
import { PageHeader } from "@/components/ui";

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className="text-sm">
      <span className={ok ? "text-emerald-600" : "text-red-600"}>{ok ? "●" : "○"}</span> {children}
    </p>
  );
}

export default async function SettingsPage() {
  const settings = await getSettings();
  const cora = isCoraConfigured();
  const evolution = isEvolutionConfigured();
  const state = evolution ? await getConnectionState().catch((e: Error) => `erro: ${e.message}`) : null;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const webhookUrl = `https://${host}/api/webhooks/cora?token=<CORA_WEBHOOK_SECRET>`;

  return (
    <>
      <PageHeader title="Configurações" />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="card space-y-2">
          <h2 className="font-semibold">Cora</h2>
          <Status ok={cora}>
            {cora ? `Configurada (ambiente: ${process.env.CORA_ENV === "production" ? "produção" : "stage/testes"})` : "Não configurada"}
          </Status>
          <Status ok={Boolean(process.env.CORA_WEBHOOK_SECRET)}>
            Webhook {process.env.CORA_WEBHOOK_SECRET ? "protegido" : "sem CORA_WEBHOOK_SECRET"}
          </Status>
          <p className="text-xs text-slate-500">
            URL do webhook para cadastrar na Cora (eventos <code>invoice.paid</code>, <code>invoice.canceled</code>, <code>invoice.overdue</code>):
          </p>
          <code className="block rounded bg-slate-100 p-2 text-xs break-all">{webhookUrl}</code>
        </section>
        <section className="card space-y-3">
          <h2 className="font-semibold">WhatsApp (Evolution API)</h2>
          <Status ok={evolution && state === "open"}>
            {evolution ? `Instância "${process.env.EVOLUTION_INSTANCE}": ${state}` : "Não configurada"}
          </Status>
          {evolution && <TestWhatsAppForm />}
        </section>
      </div>
      <SettingsForm settings={settings} variables={templateVariables} />
    </>
  );
}
