import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { charges, db, reminders, students, type Charge, type Student } from "@/db";
import { sendWhatsAppText } from "./evolution";
import { getSettings, type AppSettings } from "./settings";
import { diffDays, todayISO } from "./dates";
import { formatDate, formatMoney } from "./format";

type Kind = "before" | "due" | "after";

export function renderMessage(template: string, charge: Charge, student: Student, today = todayISO()) {
  const late = Math.max(0, diffDays(charge.dueDate, today));
  const vars: Record<string, string> = {
    nome: student.name,
    primeiro_nome: student.name.split(" ")[0],
    valor: formatMoney(charge.amount),
    vencimento: formatDate(charge.dueDate),
    descricao: charge.description,
    boleto: charge.boletoUrl ?? "(boleto indisponível)",
    linha_digitavel: charge.digitableLine ?? "",
    pix: charge.pixCode ?? "(Pix indisponível)",
    dias_atraso: String(late),
  };
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}

export function templateFor(kind: Kind, cfg: AppSettings) {
  return kind === "before" ? cfg.templateBefore : kind === "due" ? cfg.templateDue : cfg.templateAfter;
}

/** Qual lembrete (se algum) deve ser enviado hoje para esta cobrança. */
export function reminderKindForToday(dueDate: string, cfg: AppSettings, today = todayISO()): Kind | null {
  const daysUntilDue = diffDays(today, dueDate);
  if (cfg.daysBefore > 0 && daysUntilDue === cfg.daysBefore) return "before";
  if (cfg.remindOnDueDate && daysUntilDue === 0) return "due";
  if (daysUntilDue < 0 && cfg.daysAfter.includes(-daysUntilDue)) return "after";
  return null;
}

export async function sendReminder(
  charge: Charge,
  student: Student,
  kind: Kind,
  opts: { manual?: boolean; cfg?: AppSettings } = {},
) {
  const cfg = opts.cfg ?? (await getSettings());
  const today = todayISO();
  const message = renderMessage(templateFor(kind, cfg), charge, student, today);
  let success = true;
  let error: string | null = null;
  try {
    await sendWhatsAppText(student.phone, message);
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
  }
  await db.insert(reminders).values({
    chargeId: charge.id,
    kind,
    day: today,
    success,
    message,
    error,
    manual: opts.manual ?? false,
  });
  return { success, error };
}

/** Envia os lembretes automáticos do dia (executado pelo cron). */
export async function sendDueReminders() {
  const cfg = await getSettings();
  const result = { sent: 0, failed: 0, skipped: 0 };
  if (!cfg.remindersEnabled) return result;

  const today = todayISO();
  const open = await db
    .select({ charge: charges, student: students })
    .from(charges)
    .innerJoin(students, eq(students.id, charges.studentId))
    .where(and(inArray(charges.status, ["pending", "late"]), eq(students.active, true)));

  for (const { charge, student } of open) {
    const kind = reminderKindForToday(charge.dueDate, cfg, today);
    if (!kind) continue;

    const already = await db.query.reminders.findFirst({
      where: and(
        eq(reminders.chargeId, charge.id),
        eq(reminders.kind, kind),
        eq(reminders.day, today),
        eq(reminders.success, true),
        eq(reminders.manual, false),
      ),
    });
    if (already) {
      result.skipped++;
      continue;
    }
    const { success } = await sendReminder(charge, student, kind, { cfg });
    if (success) result.sent++;
    else result.failed++;
  }
  return result;
}
