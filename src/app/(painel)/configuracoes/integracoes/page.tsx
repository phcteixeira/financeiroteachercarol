import { headers } from "next/headers";
import { credentials, db } from "@/db";
import { getCoraCredentials, getEvolutionCredentials, hint } from "@/lib/credentials";
import { getConnectionState } from "@/lib/evolution";
import { formatDateTime } from "@/lib/format";
import { CoraForm, EvolutionForm } from "@/components/integration-forms";
import { TestWhatsAppForm } from "@/components/settings-form";
import { CopyButton } from "@/components/charge-actions";

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className="text-sm">
      <span className={ok ? "text-emerald-600" : "text-red-600"}>{ok ? "●" : "○"}</span> {children}
    </p>
  );
}

export default async function IntegrationsPage() {
  const [cora, evolution, rows] = await Promise.all([
    getCoraCredentials().catch(() => null),
    getEvolutionCredentials().catch(() => null),
    db.select({ key: credentials.key, updatedAt: credentials.updatedAt }).from(credentials),
  ]);
  const updated = (key: string) => rows.find((r) => r.key === key)?.updatedAt ?? null;
  const state = evolution
    ? await getConnectionState().catch((e: Error) => `erro: ${e.message}`)
    : null;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const webhookSecret = process.env.CORA_WEBHOOK_SECRET;
  const webhookUrl = webhookSecret
    ? `https://${host}/api/webhooks/cora?token=${encodeURIComponent(webhookSecret)}`
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold">Cora (boletos e Pix)</h2>
          <Status ok={Boolean(cora)}>
            {cora
              ? `Configurada — ${cora.env === "production" ? "produção" : "testes (stage)"}`
              : "Não configurada"}
            {updated("cora") && (
              <span className="text-xs text-slate-500"> · atualizada em {formatDateTime(updated("cora"))}</span>
            )}
          </Status>
          <p className="mt-1 text-xs text-slate-500">
            Obtenha as credenciais no app ou no Cora Web em <strong>Conta → Integrações via APIs</strong>,
            modalidade <strong>Integração Direta</strong>.
          </p>
        </div>
        <CoraForm
          current={{
            configured: Boolean(cora),
            source: cora?.source ?? null,
            env: cora?.env ?? "stage",
            clientId: cora?.clientId ?? "",
          }}
        />
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold">Webhook (aviso de pagamento)</h3>
          {webhookUrl ? (
            <>
              <p className="text-xs text-slate-500">
                Cadastre esta URL na Cora para os eventos de boleto <strong>pago</strong>,{" "}
                <strong>cancelado</strong> e <strong>vencido</strong>. Não compartilhe: ela contém um token secreto.
              </p>
              <code className="block rounded bg-slate-100 p-2 text-xs break-all">{webhookUrl}</code>
              <CopyButton text={webhookUrl} label="Copiar URL" />
            </>
          ) : (
            <p className="text-xs text-red-600">Variável CORA_WEBHOOK_SECRET não configurada na Vercel.</p>
          )}
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold">WhatsApp (Evolution API)</h2>
          <Status ok={state === "open"}>
            {evolution ? `Instância "${evolution.instance}": ${state}` : "Não configurada"}
            {updated("evolution") && (
              <span className="text-xs text-slate-500">
                {" "}· atualizada em {formatDateTime(updated("evolution"))}
              </span>
            )}
          </Status>
        </div>
        <EvolutionForm
          current={{
            configured: Boolean(evolution),
            source: evolution?.source ?? null,
            url: evolution?.url ?? "",
            instance: evolution?.instance ?? "",
            apiKeyHint: evolution ? hint(evolution.apiKey) : null,
          }}
        />
        {evolution && (
          <div className="border-t border-slate-100 pt-4">
            <TestWhatsAppForm />
          </div>
        )}
      </section>
    </div>
  );
}

