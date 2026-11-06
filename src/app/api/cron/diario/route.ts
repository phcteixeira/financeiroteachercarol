import { NextResponse, type NextRequest } from "next/server";
import { generateMonthlyCharges, syncOpenCharges } from "@/lib/charges";
import { sendDueReminders } from "@/lib/reminders";
import { getSettings } from "@/lib/settings";
import { todayISO } from "@/lib/dates";

export const maxDuration = 300;

/**
 * Rotina diária (Vercel Cron, ver vercel.json):
 * 1. sincroniza status das cobranças com a Cora
 * 2. gera mensalidades automaticamente (se ativado)
 * 3. envia lembretes pelo WhatsApp
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sync = await syncOpenCharges();

  const cfg = await getSettings();
  let generated: Awaited<ReturnType<typeof generateMonthlyCharges>> | null = null;
  if (cfg.autoGenerate) {
    const [y, m] = todayISO().split("-").map(Number);
    const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
    const a = await generateMonthlyCharges(y, m, { onlyWithinDays: cfg.generateDaysBefore });
    const b = await generateMonthlyCharges(next.y, next.m, { onlyWithinDays: cfg.generateDaysBefore });
    generated = { created: [...a.created, ...b.created], failed: [...a.failed, ...b.failed] };
  }

  const reminders = await sendDueReminders();
  return NextResponse.json({ ok: true, sync, generated, reminders });
}
