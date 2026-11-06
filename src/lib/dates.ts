/** Datas no fuso de São Paulo, como strings YYYY-MM-DD. */

export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T12:00:00Z`);
  const b = Date.parse(`${toISO}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Data de vencimento em um mês, ajustando dia 31 em meses curtos. */
export function dueDateFor(year: number, month: number, dueDay: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate(); // month 1-12
  const day = Math.min(dueDay, lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const monthNames = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
