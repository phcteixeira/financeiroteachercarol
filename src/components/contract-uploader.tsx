"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { registerContract } from "@/app/(painel)/actions";

export function ContractUploader({ studentId }: { studentId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setMessage({});
    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf") {
        setMessage({ error: `${file.name}: apenas arquivos PDF.` });
        continue;
      }
      try {
        setProgress(0);
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const blob = await upload(`contratos/${studentId}/${safeName}`, file, {
          access: "private",
          handleUploadUrl: "/api/contratos/upload",
          contentType: "application/pdf",
          onUploadProgress: (e) => setProgress(Math.round(e.percentage)),
        });
        const res = await registerContract({
          studentId,
          fileName: file.name,
          url: blob.url,
          size: file.size,
        });
        setMessage(res ?? {});
      } catch (err) {
        setMessage({ error: err instanceof Error ? err.message : "Falha no upload." });
      } finally {
        setProgress(null);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-indigo-700 hover:file:bg-indigo-100"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={progress !== null}
      />
      {progress !== null && <p className="text-xs text-slate-500">Enviando... {progress}%</p>}
      {message.error && <p className="text-sm text-red-600">{message.error}</p>}
      {message.ok && <p className="text-sm text-emerald-700">{message.ok}</p>}
    </div>
  );
}
