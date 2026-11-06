import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

/** Gera o token para upload direto do navegador para o Vercel Blob (arquivos grandes). */
export async function POST(request: Request) {
  await requireAuth();
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("contratos/")) throw new Error("Caminho inválido.");
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 20 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
