import { z } from "zod";
import { normalizePhone, onlyDigits, parseMoney } from "./format";

export type ActionState = { error?: string; ok?: string } | undefined;

export const uuidSchema = z.uuid();
export const isUuid = (v: string) => uuidSchema.safeParse(v).success;

function validCpf(cpf: string) {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

const money = z
  .string()
  .transform((v) => parseMoney(v))
  .refine((v): v is number => v !== null && v > 0, "Valor inválido.");

export const studentSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(120),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((v) => v.length >= 12 && v.length <= 13, "Telefone inválido (use DDD + número)."),
  document: z
    .string()
    .transform(onlyDigits)
    .refine(
      (v) => v === "" || (v.length === 11 && validCpf(v)) || v.length === 14,
      "CPF/CNPJ inválido.",
    )
    .transform((v) => v || null),
  email: z
    .string()
    .trim()
    .transform((v) => v || null)
    .refine((v) => v === null || z.email().safeParse(v).success, "E-mail inválido."),
  monthlyFee: money,
  dueDay: z.coerce.number().int().min(1, "Dia entre 1 e 31.").max(31, "Dia entre 1 e 31."),
  active: z.boolean(),
  notes: z
    .string()
    .trim()
    .transform((v) => v || null),
});

export const chargeSchema = z.object({
  studentId: uuidSchema,
  amount: money,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  description: z.string().trim().min(2, "Informe a descrição.").max(100),
});

export function firstError(err: z.ZodError) {
  return err.issues[0]?.message ?? "Dados inválidos.";
}
