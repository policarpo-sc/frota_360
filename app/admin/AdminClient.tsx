"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/types";

interface UserSummary {
  username: string;
  role: UserRole;
}

export function AdminClient() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    setUsers(await res.json());
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao criar usuário.");
      return;
    }
    setUsername("");
    setPassword("");
    setRole("viewer");
    await loadUsers();
  }

  async function handleDelete(target: string) {
    await fetch(`/api/admin/users?username=${encodeURIComponent(target)}`, { method: "DELETE" });
    await loadUsers();
  }

  async function handleRoleChange(target: string, newRole: UserRole) {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: target, role: newRole }),
    });
    await loadUsers();
  }

  async function handleForceRefresh() {
    setRefreshMessage("Atualizando...");
    const res = await fetch("/api/data/refresh", { method: "POST" });
    setRefreshMessage(res.ok ? "Dados atualizados com sucesso." : "Falha ao atualizar os dados.");
  }

  return (
    <main className="space-y-8 p-6">
      <section>
        <h1 className="mb-2 text-lg font-semibold text-slate-900">Atualização de dados</h1>
        <button
          onClick={handleForceRefresh}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Atualizar dados agora
        </button>
        {refreshMessage && <p className="mt-2 text-sm text-slate-600">{refreshMessage}</p>}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Usuários</h2>
        <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {users.map((u) => (
            <li key={u.username} className="flex items-center justify-between px-4 py-2">
              <span className="text-sm text-slate-700">{u.username}</span>
              <div className="flex items-center gap-2">
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.username, e.target.value as UserRole)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="viewer">viewer</option>
                  <option value="admin">admin</option>
                </select>
                <button
                  onClick={() => handleDelete(u.username)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500">Usuário</label>
            <input
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Senha</label>
            <input
              type="password"
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Perfil</label>
            <select
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="viewer">viewer</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
            Adicionar
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>
    </main>
  );
}
