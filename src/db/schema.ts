import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const chargeStatus = pgEnum("charge_status", [
  "pending", // criada, aguardando pagamento
  "paid",
  "late",
  "canceled",
  "error", // falha ao registrar na Cora
]);

export const reminderKind = pgEnum("reminder_kind", ["before", "due", "after"]);

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull(), // apenas dígitos, com DDI (ex: 5511999999999)
  document: text("document"), // CPF/CNPJ, apenas dígitos (exigido pela Cora)
  email: text("email"),
  monthlyFee: integer("monthly_fee").notNull(), // em centavos
  dueDay: integer("due_day").notNull(), // dia do vencimento (1-31)
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  blobUrl: text("blob_url").notNull(),
  size: integer("size").notNull().default(0),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const charges = pgTable(
  "charges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amount: integer("amount").notNull(), // em centavos
    dueDate: date("due_date").notNull(), // YYYY-MM-DD
    reference: text("reference"), // ex: "2026-11" (evita cobrança mensal duplicada)
    status: chargeStatus("status").notNull().default("pending"),
    coraInvoiceId: text("cora_invoice_id"),
    coraStatus: text("cora_status"),
    boletoUrl: text("boleto_url"),
    digitableLine: text("digitable_line"),
    pixCode: text("pix_code"),
    errorMessage: text("error_message"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("charges_student_reference_idx").on(t.studentId, t.reference)],
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chargeId: uuid("charge_id")
      .notNull()
      .references(() => charges.id, { onDelete: "cascade" }),
    kind: reminderKind("kind").notNull(),
    // dia (YYYY-MM-DD) a que o lembrete se refere: garante no máximo 1 envio por tipo/dia
    day: date("day").notNull(),
    success: boolean("success").notNull(),
    message: text("message").notNull(),
    error: text("error"),
    manual: boolean("manual").notNull().default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const studentsRelations = relations(students, ({ many }) => ({
  contracts: many(contracts),
  charges: many(charges),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  student: one(students, { fields: [contracts.studentId], references: [students.id] }),
}));

export const chargesRelations = relations(charges, ({ one, many }) => ({
  student: one(students, { fields: [charges.studentId], references: [students.id] }),
  reminders: many(reminders),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  charge: one(charges, { fields: [reminders.chargeId], references: [charges.id] }),
}));

export type Student = typeof students.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Charge = typeof charges.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
