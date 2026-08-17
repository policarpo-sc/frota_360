import { NextRequest, NextResponse } from "next/server";
import { createUser, deleteUser, getUser, listUsers, updateUser } from "@/lib/auth/users";
import type { UserRole } from "@/lib/types";

function isValidRole(role: unknown): role is UserRole {
  return role === "admin" || role === "viewer";
}

export async function GET() {
  const users = await listUsers();
  return NextResponse.json(users.map((u) => ({ username: u.username, role: u.role })));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (
    typeof body?.username !== "string" ||
    !body.username.trim() ||
    typeof body?.password !== "string" ||
    body.password.length < 6 ||
    !isValidRole(body?.role)
  ) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const existing = await getUser(body.username);
  if (existing) {
    return NextResponse.json({ error: "Usuário já existe." }, { status: 409 });
  }
  const user = await createUser({ username: body.username, password: body.password, role: body.role });
  return NextResponse.json({ username: user.username, role: user.role }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.username !== "string" || !body.username.trim()) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  if (body.role !== undefined && !isValidRole(body.role)) {
    return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  }
  if (body.password !== undefined && (typeof body.password !== "string" || body.password.length < 6)) {
    return NextResponse.json({ error: "Senha muito curta." }, { status: 400 });
  }

  if (body.role !== undefined && body.role !== "admin") {
    const users = await listUsers();
    const target = users.find((u) => u.username === body.username);
    const isDemotingAdmin = target?.role === "admin";
    const adminCount = users.filter((u) => u.role === "admin").length;
    if (isDemotingAdmin && adminCount <= 1) {
      return NextResponse.json(
        { error: "Não é possível remover o último administrador." },
        { status: 400 }
      );
    }
  }

  const updated = await updateUser(body.username, { role: body.role, password: body.password });
  if (!updated) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  return NextResponse.json({ username: updated.username, role: updated.role });
}

export async function DELETE(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Usuário não informado." }, { status: 400 });

  const currentUsername = request.headers.get("x-username");
  if (currentUsername && currentUsername === username) {
    return NextResponse.json(
      { error: "Não é possível remover sua própria conta." },
      { status: 400 }
    );
  }

  const users = await listUsers();
  const target = users.find((u) => u.username === username);
  if (target?.role === "admin") {
    const adminCount = users.filter((u) => u.role === "admin").length;
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Não é possível remover o último administrador." },
        { status: 400 }
      );
    }
  }

  await deleteUser(username);
  return NextResponse.json({ ok: true });
}
