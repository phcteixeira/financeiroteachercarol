import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { contracts, db } from "@/db";
import { requireAuth } from "@/lib/auth";

/** Download do contrato (o arquivo fica privado no Blob; só usuários logados acessam). */
export async function GET(_req: Request, ctx: RouteContext<"/api/contratos/[id]">) {
  await requireAuth();
  const { id } = await ctx.params;
  const contract = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
  if (!contract) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const file = await get(contract.blobUrl, { access: "private" });
  if (!file || file.statusCode !== 200) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
  return new Response(file.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(contract.fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
