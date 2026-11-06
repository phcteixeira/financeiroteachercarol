import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { syncChargeByInvoiceId } from "@/lib/charges";

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Webhook da Cora. Cadastre na Cora a URL:
 *   https://SEU-DOMINIO/api/webhooks/cora?token=CORA_WEBHOOK_SECRET
 * A Cora envia os dados nos headers (webhook-event-type, webhook-resource-id).
 * Como a notificação não é assinada, nunca confiamos no conteúdo: o status
 * é sempre reconsultado na API da Cora.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CORA_WEBHOOK_SECRET;
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!secret || !safeEqual(token, secret)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const eventType = request.headers.get("webhook-event-type") ?? "";
  const invoiceId = request.headers.get("webhook-resource-id") ?? "";

  if (eventType.startsWith("invoice.") && invoiceId.startsWith("inv_")) {
    try {
      const status = await syncChargeByInvoiceId(invoiceId);
      return NextResponse.json({ success: true, status });
    } catch (err) {
      console.error("Erro ao processar webhook Cora", err);
      return NextResponse.json({ success: false }, { status: 500 });
    }
  }
  return NextResponse.json({ success: true, ignored: true });
}
