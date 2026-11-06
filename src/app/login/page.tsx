"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={action} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Financeiro Teacher Carol</h1>
          <p className="text-sm text-slate-500">Acesse o painel de gestão</p>
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" required autoFocus className="input" />
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
