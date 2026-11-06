/** Utilitários de formatação (podem ser usados no cliente e no servidor). */

export function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "150,00" | "150.00" | "1.500,50" -> centavos */
export function parseMoney(input: string): number | null {
  const clean = input.replace(/[^\d,.-]/g, "").trim();
  if (!clean) return null;
  let normalized = clean;
  if (clean.includes(",")) normalized = clean.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** "2026-11-06" -> "06/11/2026" */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function formatDateTime(date: Date | null | undefined) {
  if (!date) return "-";
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** Normaliza telefone brasileiro para o formato do WhatsApp (55 + DDD + número). */
export function normalizePhone(value: string) {
  const digits = onlyDigits(value);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function formatPhone(digits: string) {
  const d = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export function formatDocument(digits: string | null) {
  if (!digits) return "-";
  if (digits.length === 11)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length === 14)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  return digits;
}

export const statusLabels: Record<string, string> = {
  pending: "Em aberto",
  paid: "Pago",
  late: "Atrasado",
  canceled: "Cancelado",
  error: "Erro",
};

export const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  late: "bg-red-100 text-red-800",
  canceled: "bg-slate-200 text-slate-600",
  error: "bg-rose-200 text-rose-900",
};
