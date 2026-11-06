import "server-only";
import type { Student } from "@/db/schema";
import { dueDateFor, todayISO } from "./dates";
import { monthlyDescription } from "./charges";

/** Próximo vencimento do aluno a partir de hoje. */
export function nextDueDate(student: Pick<Student, "dueDay">) {
  const today = todayISO();
  const [y, m] = today.split("-").map(Number);
  const thisMonth = dueDateFor(y, m, student.dueDay);
  if (thisMonth >= today) return thisMonth;
  return m === 12 ? dueDateFor(y + 1, 1, student.dueDay) : dueDateFor(y, m + 1, student.dueDay);
}

export function toStudentOption(s: Student) {
  const due = nextDueDate(s);
  return {
    id: s.id,
    name: s.name,
    monthlyFee: s.monthlyFee,
    nextDueDate: due,
    description: monthlyDescription(due),
  };
}
