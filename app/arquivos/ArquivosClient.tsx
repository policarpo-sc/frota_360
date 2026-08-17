"use client";

import { useEffect, useState } from "react";
import type { DriveFile } from "@/lib/drive";

export function ArquivosClient() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/files")
      .then((res) => res.json())
      .then((f: DriveFile[]) => setFiles(f))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="p-6 text-slate-500">Carregando...</main>;

  if (error) {
    return (
      <main className="p-6">
        <h1 className="mb-4 text-lg font-semibold text-slate-900">Arquivos do projeto</h1>
        <p className="text-red-600">Não foi possível carregar os arquivos.</p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Arquivos do projeto</h1>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {files.map((file) => (
          <li key={file.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-700">{file.name}</span>
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-900 underline"
            >
              Abrir
            </a>
          </li>
        ))}
        {files.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500">Nenhum arquivo encontrado.</li>
        )}
      </ul>
    </main>
  );
}
