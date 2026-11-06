import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const PDF = ["application/pdf"];

/**
 * Gera uma URL pré-assinada para o navegador enviar o PDF direto ao Vercel Blob
 * (sem passar pelo limite de tamanho das funções). Funciona com o Blob conectado
 * via OIDC (BLOB_STORE_ID) ou com BLOB_READ_WRITE_TOKEN.
 */
export async function POST(request: Request) {
  await requireAuth();
  const body = (await request.json()) as HandleUploadPresignedBody;
  try {
    const json = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        if (!/^contratos\/[0-9a-f-]{36}\/[\w.\-]+\.pdf$/i.test(pathname)) {
          throw new Error("Caminho de arquivo inválido.");
        }
        const validUntil = Date.now() + 10 * 60 * 1000;
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: PDF,
          maximumSizeInBytes: MAX_SIZE,
          validUntil,
        });
        return {
          token,
          urlOptions: { validUntil, allowedContentTypes: PDF, maximumSizeInBytes: MAX_SIZE },
        };
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
