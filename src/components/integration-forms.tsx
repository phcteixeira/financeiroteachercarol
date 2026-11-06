"use client";

import { useActionState, useRef } from "react";
import {
  removeCoraAction,
  removeEvolutionAction,
  saveCoraAction,
  saveEvolutionAction,
  testCoraAction,
} from "@/app/(painel)/configuracoes/integracoes/actions";
import { FormMessage } from "./ui";

/** Textarea para PEM com botão para carregar o arquivo do computador. */
function PemField({
  name,
  label,
  accept,
  placeholder,
  configured,
}: {
  name: string;
  label: string;
  accept: string;
  placeholder: string;
  configured: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <label className="label mb-0" htmlFor={name}>{label}</label>
        <label className="btn-secondary btn-sm cursor-pointer">
          Carregar arquivo
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && ref.current) ref.current.value = await file.text();
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <textarea
        ref={ref}
        id={name}
        name={name}
        rows={4}
        spellCheck={false}
        autoComplete="off"
        placeholder={configured ? "Já cadastrado — deixe em branco para manter" : placeholder}
        className="input font-mono text-xs"
      />
    </div>
  );
}

function SourceNote({ source }: { source: "painel" | "ambiente" | null }) {
  if (source === "ambiente") {
    return (
      <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
        Hoje as credenciais vêm das variáveis de ambiente da Vercel. Ao salvar aqui, as do painel passam a valer.
      </p>
    );
  }
  return null;
}

export interface CoraView {
  configured: boolean;
  source: "painel" | "ambiente" | null;
  env: "stage" | "production";
  clientId: string;
}

export function CoraForm({ current }: { current: CoraView }) {
  const [state, action, pending] = useActionState(saveCoraAction, undefined);
  const [testState, testAction, testing] = useActionState(testCoraAction, undefined);
  const [removeState, removeAction, removing] = useActionState(removeCoraAction, undefined);

  return (
    <div className="space-y-4">
      <SourceNote source={current.source} />
      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="env">Ambiente</label>
            <select id="env" name="env" defaultValue={current.env} className="input">
              <option value="stage">Testes (stage)</option>
              <option value="production">Produção (cobranças reais)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="clientId">Client ID</label>
            <input
              id="clientId"
              name="clientId"
              autoComplete="off"
              defaultValue={current.clientId}
              placeholder="int-..."
              className="input font-mono"
            />
          </div>
        </div>
        <PemField
          name="certificate"
          label="Certificado (.pem)"
          accept=".pem,.crt,.cer,text/plain"
          placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
          configured={current.configured}
        />
        <PemField
          name="privateKey"
          label="Chave privada (.key)"
          accept=".key,.pem,text/plain"
          placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
          configured={current.configured}
        />
        <p className="text-xs text-slate-500">
          Cada ambiente da Cora tem seu próprio certificado e chave. Ao salvar, o painel testa a conexão antes.
        </p>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" name="force" /> Salvar mesmo se o teste de conexão falhar
        </label>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <FormMessage state={state} />
          <button className="btn-primary" disabled={pending}>
            {pending ? "Testando e salvando..." : "Salvar credenciais da Cora"}
          </button>
        </div>
      </form>

      {current.configured && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <form action={testAction}>
            <button className="btn-secondary btn-sm" disabled={testing}>
              {testing ? "Testando..." : "Testar conexão"}
            </button>
          </form>
          {current.source === "painel" && (
            <form
              action={removeAction}
              onSubmit={(e) => {
                if (!confirm("Remover as credenciais da Cora do painel?")) e.preventDefault();
              }}
            >
              <button className="btn-secondary btn-sm" disabled={removing}>Remover</button>
            </form>
          )}
          <FormMessage state={testState ?? removeState} />
        </div>
      )}
    </div>
  );
}

export interface EvolutionView {
  configured: boolean;
  source: "painel" | "ambiente" | null;
  url: string;
  instance: string;
  apiKeyHint: string | null;
}

export function EvolutionForm({ current }: { current: EvolutionView }) {
  const [state, action, pending] = useActionState(saveEvolutionAction, undefined);
  const [removeState, removeAction, removing] = useActionState(removeEvolutionAction, undefined);

  return (
    <div className="space-y-4">
      <SourceNote source={current.source} />
      <form action={action} className="space-y-4">
        <div>
          <label className="label" htmlFor="url">URL da Evolution API</label>
          <input
            id="url"
            name="url"
            type="url"
            required
            defaultValue={current.url}
            placeholder="https://evolution.seudominio.com.br"
            className="input"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="instance">Nome da instância</label>
            <input id="instance" name="instance" required defaultValue={current.instance} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="apiKey">API key</label>
            <input
              id="apiKey"
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder={current.apiKeyHint ? `Cadastrada (${current.apiKeyHint}) — em branco mantém` : ""}
              className="input"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" name="force" /> Salvar mesmo se o teste de conexão falhar
        </label>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <FormMessage state={state} />
          <button className="btn-primary" disabled={pending}>
            {pending ? "Testando e salvando..." : "Salvar credenciais da Evolution"}
          </button>
        </div>
      </form>
      {current.source === "painel" && (
        <form
          action={removeAction}
          className="flex items-center gap-2 border-t border-slate-100 pt-4"
          onSubmit={(e) => {
            if (!confirm("Remover as credenciais da Evolution do painel?")) e.preventDefault();
          }}
        >
          <button className="btn-secondary btn-sm" disabled={removing}>Remover</button>
          <FormMessage state={removeState} />
        </form>
      )}
    </div>
  );
}
