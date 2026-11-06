"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { error: "ADMIN_PASSWORD não configurada no servidor." };

  // pequeno atraso para dificultar tentativas em massa
  await new Promise((r) => setTimeout(r, 400));
  if (!safeEqual(password, expected)) return { error: "Senha incorreta." };

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
