"use client";

import { useEffect, useState } from "react";
import type { DriveFile } from "@/lib/drive";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

interface BreadcrumbEntry {
  id: string | null; // null = root
  name: string;
}

export function ArquivosClient() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [path, setPath] = useState<BreadcrumbEntry[]>([{ id: null, name: "Documentos" }]);

  const currentFolderId = path[path.length - 1].id;

  useEffect(() => {
    setLoading(true);
    setError(false);
    const url = currentFolderId
      ? `/api/files?folderId=${encodeURIComponent(currentFolderId)}`
      : "/api/files";
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar arquivos");
        return res.json();
      })
      .then((f: DriveFile[]) => setFiles(f))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [currentFolderId]);

  function openFolder(file: DriveFile) {
    setPath((prev) => [...prev, { id: file.id, name: file.name }]);
  }

  function goToBreadcrumb(index: number) {
    setPath((prev) => prev.slice(0, index + 1));
  }

  return (
    <main className="p-6">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Arquivos do projeto</h1>

      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {path.map((entry, index) => (
          <span key={entry.id ?? "root"} className="flex items-center gap-1">
            {index > 0 && <span>/</span>}
            {index === path.length - 1 ? (
              <span className="font-medium text-slate-900">{entry.name}</span>
            ) : (
              <button onClick={() => goToBreadcrumb(index)} className="hover:underline">
                {entry.name}
              </button>
            )}
          </span>
        ))}
      </nav>

      {loading && <p className="text-slate-500">Carregando...</p>}

      {!loading && error && <p className="text-red-600">Não foi possível carregar os arquivos.</p>}

      {!loading && !error && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {files.map((file) => {
            const isFolder = file.mimeType === FOLDER_MIME_TYPE;
            return (
              <li key={file.id} className="flex items-center justify-between px-4 py-3">
                {isFolder ? (
                  <button
                    onClick={() => openFolder(file)}
                    className="text-sm font-medium text-slate-700 hover:underline"
                  >
                    📁 {file.name}
                  </button>
                ) : (
                  <span className="text-sm text-slate-700">{file.name}</span>
                )}
                {!isFolder && (
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-slate-900 underline"
                  >
                    Abrir
                  </a>
                )}
              </li>
            );
          })}
          {files.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">Nenhum arquivo encontrado.</li>
          )}
        </ul>
      )}
    </main>
  );
}
