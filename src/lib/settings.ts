import "server-only";
import { db, settings } from "@/db";

export interface AppSettings {
  remindersEnabled: boolean;
  daysBefore: number; // lembrete X dias antes do vencimento (0 = desligado)
  remindOnDueDate: boolean;
  daysAfter: number[]; // lembretes após o vencimento, ex: [1, 3, 7]
  autoGenerate: boolean; // gerar cobranças mensais automaticamente
  generateDaysBefore: number; // gerar o boleto X dias antes do vencimento
  finePercent: number;
  interestPercent: number;
  serviceName: string;
  templateBefore: string;
  templateDue: string;
  templateAfter: string;
}

export const defaultSettings: AppSettings = {
  remindersEnabled: true,
  daysBefore: 3,
  remindOnDueDate: true,
  daysAfter: [1, 5],
  autoGenerate: false,
  generateDaysBefore: 10,
  finePercent: 2,
  interestPercent: 1,
  serviceName: "Mensalidade - Aulas de Inglês",
  templateBefore:
    "Olá, {nome}! 😊\nPassando para lembrar que sua mensalidade de {valor} vence em {vencimento}.\n\nBoleto: {boleto}\n\nPix copia e cola:\n{pix}\n\nQualquer dúvida, estou à disposição!",
  templateDue:
    "Olá, {nome}! Hoje ({vencimento}) é o dia do vencimento da sua mensalidade de {valor}.\n\nBoleto: {boleto}\n\nPix copia e cola:\n{pix}\n\nObrigada!",
  templateAfter:
    "Olá, {nome}. Não identificamos o pagamento da mensalidade de {valor}, vencida em {vencimento} ({dias_atraso} dia(s) de atraso).\n\nBoleto: {boleto}\n\nPix copia e cola:\n{pix}\n\nSe já pagou, por favor desconsidere esta mensagem.",
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(settings);
  const stored: Partial<AppSettings> = {};
  for (const row of rows) {
    try {
      (stored as Record<string, unknown>)[row.key] = JSON.parse(row.value);
    } catch {
      /* ignora valor inválido */
    }
  }
  return { ...defaultSettings, ...stored };
}

export async function saveSettings(values: AppSettings) {
  const rows = Object.entries(values).map(([key, value]) => ({ key, value: JSON.stringify(value) }));
  for (const row of rows) {
    await db
      .insert(settings)
      .values(row)
      .onConflictDoUpdate({ target: settings.key, set: { value: row.value } });
  }
}

export const templateVariables = [
  "{nome}",
  "{primeiro_nome}",
  "{valor}",
  "{vencimento}",
  "{descricao}",
  "{boleto}",
  "{linha_digitavel}",
  "{pix}",
  "{dias_atraso}",
];
