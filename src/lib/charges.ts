import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { charges, db, students, type Charge, type Student } from "@/db";
import {
  cancelInvoice,
  createInvoice,
  getInvoice,
  isCoraConfigured,
  mapCoraStatus,
  type CoraInvoice,
} from "./cora";
import { getSettings } from "./settings";
import { dueDateFor, monthNames, todayISO, addDays } from "./dates";

function invoiceFields(inv: CoraInvoice) {
  const status = mapCoraStatus(inv.status);
  return {
    coraInvoiceId: inv.id,
    coraStatus: inv.status,
    status,
    boletoUrl: inv.payment_options?.bank_slip?.url ?? null,
    digitableLine: inv.payment_options?.bank_slip?.digitable ?? null,
    pixCode: inv.pix?.emv ?? null,
    errorMessage: null,
    updatedAt: new Date(),
  };
}

/** Registra (ou tenta novamente registrar) a cobrança na Cora. Em caso de falha, marca como "error". */
export async function registerChargeOnCora(charge: Charge, student: Student, retry = false) {
  try {
    if (!isCoraConfigured()) {
      throw new Error("Integração Cora não configurada (CORA_CLIENT_ID, CORA_CERTIFICATE, CORA_PRIVATE_KEY).");
    }
    if (!student.document) {
      throw new Error(`O aluno ${student.name} não tem CPF/CNPJ cadastrado (obrigatório para emitir boleto).`);
    }
    const cfg = await getSettings();
    const inv = await createInvoice({
      code: charge.id,
      idempotencyKey: retry ? randomUUID() : charge.id,
      customer: { name: student.name, email: student.email, document: student.document },
      serviceName: cfg.serviceName,
      description: charge.description,
      amount: charge.amount,
      dueDate: charge.dueDate,
      finePercent: cfg.finePercent,
      interestPercent: cfg.interestPercent,
    });
    await db.update(charges).set(invoiceFields(inv)).where(eq(charges.id, charge.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(charges)
      .set({ status: "error", errorMessage: message, updatedAt: new Date() })
      .where(eq(charges.id, charge.id));
    throw err;
  }
}

export interface NewCharge {
  studentId: string;
  amount: number;
  dueDate: string;
  description: string;
  reference?: string | null;
}

/** Cria a cobrança no banco e emite o boleto/Pix na Cora. */
export async function createCharge(input: NewCharge) {
  const student = await db.query.students.findFirst({ where: eq(students.id, input.studentId) });
  if (!student) throw new Error("Aluno não encontrado.");
  if (input.amount < 500) throw new Error("O valor mínimo de um boleto na Cora é R$ 5,00.");
  if (input.dueDate < todayISO()) throw new Error("O vencimento não pode ser anterior a hoje.");

  const [charge] = await db
    .insert(charges)
    .values({
      studentId: input.studentId,
      amount: input.amount,
      dueDate: input.dueDate,
      description: input.description,
      reference: input.reference ?? null,
    })
    .returning();

  try {
    await registerChargeOnCora(charge, student);
    return { charge, error: null as string | null };
  } catch (err) {
    return { charge, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function retryCharge(chargeId: string) {
  const charge = await db.query.charges.findFirst({
    where: eq(charges.id, chargeId),
    with: { student: true },
  });
  if (!charge) throw new Error("Cobrança não encontrada.");
  if (charge.coraInvoiceId) throw new Error("Esta cobrança já foi registrada na Cora.");
  if (charge.dueDate < todayISO()) throw new Error("Vencimento já passou. Crie uma nova cobrança.");
  await registerChargeOnCora(charge, charge.student, true);
}

export async function cancelCharge(chargeId: string) {
  const charge = await db.query.charges.findFirst({ where: eq(charges.id, chargeId) });
  if (!charge) throw new Error("Cobrança não encontrada.");
  if (charge.status === "paid") throw new Error("Cobrança já paga não pode ser cancelada.");
  if (charge.coraInvoiceId) await cancelInvoice(charge.coraInvoiceId);
  await db
    .update(charges)
    .set({ status: "canceled", coraStatus: charge.coraInvoiceId ? "CANCELLED" : null, updatedAt: new Date() })
    .where(eq(charges.id, chargeId));
}

export async function markChargePaidManually(chargeId: string) {
  await db
    .update(charges)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(eq(charges.id, chargeId));
}

/** Atualiza a cobrança com o status atual do boleto na Cora. */
export async function syncChargeByInvoiceId(invoiceId: string) {
  const charge = await db.query.charges.findFirst({ where: eq(charges.coraInvoiceId, invoiceId) });
  if (!charge) return null;
  const inv = await getInvoice(invoiceId);
  const fields = invoiceFields(inv);
  await db
    .update(charges)
    .set({
      ...fields,
      // não reabre cobrança marcada manualmente como paga
      status: charge.status === "paid" ? "paid" : fields.status,
      paidAt: fields.status === "paid" ? (charge.paidAt ?? new Date()) : charge.paidAt,
    })
    .where(eq(charges.id, charge.id));
  return fields.status;
}

/** Sincroniza todas as cobranças em aberto com a Cora e marca atrasadas. */
export async function syncOpenCharges() {
  const today = todayISO();
  let synced = 0;
  const errors: string[] = [];

  if (isCoraConfigured()) {
    const open = await db
      .select({ invoiceId: charges.coraInvoiceId })
      .from(charges)
      .where(and(inArray(charges.status, ["pending", "late"]), isNotNull(charges.coraInvoiceId)));
    for (const row of open) {
      try {
        await syncChargeByInvoiceId(row.invoiceId!);
        synced++;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  // Garante status "atrasado" mesmo se a Cora ainda não tiver atualizado.
  await db
    .update(charges)
    .set({ status: "late", updatedAt: new Date() })
    .where(and(eq(charges.status, "pending"), lt(charges.dueDate, today)));

  return { synced, errors };
}

export function monthlyReference(dueDate: string) {
  return dueDate.slice(0, 7); // YYYY-MM
}

export function monthlyDescription(dueDate: string) {
  const [y, m] = dueDate.split("-").map(Number);
  return `Mensalidade ${monthNames[m - 1]}/${y}`;
}

/**
 * Gera as mensalidades de um mês (ano/mês 1-12) para todos os alunos ativos
 * que ainda não têm cobrança desse mês.
 */
export async function generateMonthlyCharges(
  year: number,
  month: number,
  opts: { onlyWithinDays?: number } = {},
) {
  const today = todayISO();
  const active = await db.query.students.findMany({ where: eq(students.active, true) });
  const reference = `${year}-${String(month).padStart(2, "0")}`;
  const existing = await db
    .select({ studentId: charges.studentId })
    .from(charges)
    .where(eq(charges.reference, reference));
  const already = new Set(existing.map((e) => e.studentId));

  const created: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const student of active) {
    if (already.has(student.id)) continue;
    const dueDate = dueDateFor(year, month, student.dueDay);
    if (dueDate < today) continue;
    if (opts.onlyWithinDays !== undefined && dueDate > addDays(today, opts.onlyWithinDays)) continue;

    const { error } = await createCharge({
      studentId: student.id,
      amount: student.monthlyFee,
      dueDate,
      description: monthlyDescription(dueDate),
      reference,
    }).catch((err) => ({ error: err instanceof Error ? err.message : String(err) }));
    if (error) failed.push({ name: student.name, error });
    else created.push(student.name);
  }
  return { created, failed };
}
