"use server";

import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { charges, contracts, db, students } from "@/db";
import { requireAuth } from "@/lib/auth";
import {
  cancelCharge,
  createCharge,
  generateMonthlyCharges,
  markChargePaidManually,
  retryCharge,
  syncChargeByInvoiceId,
  syncOpenCharges,
} from "@/lib/charges";
import { sendReminder } from "@/lib/reminders";
import { sendWhatsAppText } from "@/lib/evolution";
import { getSettings, saveSettings, type AppSettings } from "@/lib/settings";
import { todayISO, diffDays } from "@/lib/dates";
import { normalizePhone } from "@/lib/format";
import {
  chargeSchema,
  firstError,
  isUuid,
  studentSchema,
  type ActionState,
} from "@/lib/validation";

const msg = (err: unknown) => (err instanceof Error ? err.message : String(err));

function revalidateAll() {
  revalidatePath("/", "layout");
}

/* ---------------------------------- Alunos --------------------------------- */

function readStudent(formData: FormData) {
  return studentSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    document: String(formData.get("document") ?? ""),
    email: String(formData.get("email") ?? ""),
    monthlyFee: String(formData.get("monthlyFee") ?? ""),
    dueDay: formData.get("dueDay"),
    active: formData.get("active") === "on",
    notes: String(formData.get("notes") ?? ""),
  });
}

export async function createStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAuth();
  const parsed = readStudent(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const [student] = await db.insert(students).values(parsed.data).returning({ id: students.id });
  revalidateAll();
  redirect(`/alunos/${student.id}`);
}

export async function updateStudent(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAuth();
  if (!isUuid(id)) return { error: "Aluno inválido." };
  const parsed = readStudent(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db
    .update(students)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(students.id, id));
  revalidateAll();
  return { ok: "Dados salvos." };
}

export async function deleteStudent(id: string) {
  await requireAuth();
  if (!isUuid(id)) return;
  const files = await db.select().from(contracts).where(eq(contracts.studentId, id));
  if (files.length) await del(files.map((f) => f.blobUrl)).catch(() => {});
  await db.delete(students).where(eq(students.id, id));
  revalidateAll();
  redirect("/alunos");
}

/* -------------------------------- Contratos -------------------------------- */

export async function registerContract(input: {
  studentId: string;
  fileName: string;
  url: string;
  size: number;
}): Promise<ActionState> {
  await requireAuth();
  if (!isUuid(input.studentId)) return { error: "Aluno inválido." };
  let host = "";
  try {
    host = new URL(input.url).hostname;
  } catch {
    /* url inválida */
  }
  if (!host.endsWith(".blob.vercel-storage.com")) return { error: "URL do arquivo inválida." };
  await db.insert(contracts).values({
    studentId: input.studentId,
    fileName: input.fileName.slice(0, 200),
    blobUrl: input.url,
    size: Math.max(0, Math.round(input.size)),
  });
  revalidatePath(`/alunos/${input.studentId}`);
  return { ok: "Contrato enviado." };
}

export async function deleteContract(id: string) {
  await requireAuth();
  if (!isUuid(id)) return;
  const [row] = await db.delete(contracts).where(eq(contracts.id, id)).returning();
  if (row) {
    await del(row.blobUrl).catch(() => {});
    revalidatePath(`/alunos/${row.studentId}`);
  }
}

/* -------------------------------- Cobranças -------------------------------- */

export async function createChargeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAuth();
  const parsed = chargeSchema.safeParse({
    studentId: String(formData.get("studentId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  try {
    const { error } = await createCharge(parsed.data);
    revalidateAll();
    if (error) return { error: `Cobrança salva, mas não registrada na Cora: ${error}` };
    return { ok: "Cobrança criada e boleto emitido na Cora." };
  } catch (err) {
    return { error: msg(err) };
  }
}

export async function generateMonthAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAuth();
  const month = String(formData.get("month") ?? ""); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Mês inválido." };
  const [y, m] = month.split("-").map(Number);
  try {
    const { created, failed } = await generateMonthlyCharges(y, m);
    revalidateAll();
    if (!created.length && !failed.length) {
      return { ok: "Nenhuma cobrança nova: todos os alunos ativos já têm cobrança neste mês (ou o vencimento já passou)." };
    }
    const parts = [`${created.length} cobrança(s) criada(s).`];
    if (failed.length) parts.push(`Falhas: ${failed.map((f) => `${f.name} (${f.error})`).join("; ")}`);
    return failed.length ? { error: parts.join(" ") } : { ok: parts.join(" ") };
  } catch (err) {
    return { error: msg(err) };
  }
}

export async function chargeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  if (!isUuid(id)) return { error: "Cobrança inválida." };

  try {
    const charge = await db.query.charges.findFirst({
      where: eq(charges.id, id),
      with: { student: true },
    });
    if (!charge) return { error: "Cobrança não encontrada." };

    switch (op) {
      case "sync":
        if (!charge.coraInvoiceId) return { error: "Cobrança sem boleto na Cora." };
        await syncChargeByInvoiceId(charge.coraInvoiceId);
        break;
      case "retry":
        await retryCharge(id);
        break;
      case "cancel":
        await cancelCharge(id);
        break;
      case "paid":
        await markChargePaidManually(id);
        break;
      case "delete":
        if (charge.coraInvoiceId && !["canceled", "paid"].includes(charge.status)) {
          return { error: "Cancele o boleto antes de excluir." };
        }
        await db.delete(charges).where(eq(charges.id, id));
        break;
      case "remind": {
        if (!["pending", "late"].includes(charge.status)) {
          return { error: "Só é possível lembrar cobranças em aberto." };
        }
        const diff = diffDays(todayISO(), charge.dueDate);
        const kind = diff > 0 ? "before" : diff === 0 ? "due" : "after";
        const res = await sendReminder(charge, charge.student, kind, { manual: true });
        revalidateAll();
        return res.success ? { ok: "Lembrete enviado pelo WhatsApp." } : { error: res.error ?? "Falha no envio." };
      }
      default:
        return { error: "Operação inválida." };
    }
    revalidateAll();
    return { ok: "Feito." };
  } catch (err) {
    revalidateAll();
    return { error: msg(err) };
  }
}

export async function syncAllAction(): Promise<ActionState> {
  await requireAuth();
  try {
    const { synced, errors } = await syncOpenCharges();
    revalidateAll();
    if (errors.length) return { error: `${synced} sincronizada(s). Erros: ${errors.slice(0, 3).join("; ")}` };
    return { ok: `${synced} cobrança(s) sincronizada(s) com a Cora.` };
  } catch (err) {
    return { error: msg(err) };
  }
}

/* ------------------------------ Configurações ------------------------------ */

export async function saveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAuth();
  const current = await getSettings();
  const num = (name: string, min: number, max: number) => {
    const n = Number(String(formData.get(name) ?? "").replace(",", "."));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : NaN;
  };
  const daysAfter = String(formData.get("daysAfter") ?? "")
    .split(/[,;\s]+/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0 && n <= 90);

  const next: AppSettings = {
    remindersEnabled: formData.get("remindersEnabled") === "on",
    daysBefore: num("daysBefore", 0, 30),
    remindOnDueDate: formData.get("remindOnDueDate") === "on",
    daysAfter: [...new Set(daysAfter)].sort((a, b) => a - b),
    autoGenerate: formData.get("autoGenerate") === "on",
    generateDaysBefore: num("generateDaysBefore", 1, 30),
    finePercent: num("finePercent", 0, 2),
    interestPercent: num("interestPercent", 0, 1),
    serviceName: String(formData.get("serviceName") ?? "").trim() || current.serviceName,
    templateBefore: String(formData.get("templateBefore") ?? "").trim() || current.templateBefore,
    templateDue: String(formData.get("templateDue") ?? "").trim() || current.templateDue,
    templateAfter: String(formData.get("templateAfter") ?? "").trim() || current.templateAfter,
  };
  for (const [k, v] of Object.entries(next)) {
    if (typeof v === "number" && Number.isNaN(v)) return { error: `Valor inválido em "${k}".` };
  }
  await saveSettings(next);
  revalidateAll();
  return { ok: "Configurações salvas." };
}

export async function testWhatsAppAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAuth();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (phone.length < 12) return { error: "Telefone inválido." };
  try {
    await sendWhatsAppText(phone, "✅ Teste de envio do painel financeiro Teacher Carol.");
    return { ok: "Mensagem de teste enviada." };
  } catch (err) {
    return { error: msg(err) };
  }
}

