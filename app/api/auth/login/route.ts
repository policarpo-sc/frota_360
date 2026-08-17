import { NextRequest, NextResponse } from "next/server";
import { ensureSeedAdmin, verifyPassword } from "@/lib/auth/users";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const GENERIC_ERROR = "Usuário ou senha inválidos.";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  let user;
  try {
    await ensureSeedAdmin();
    user = await verifyPassword(username, password);
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const token = await createSessionToken({ username: user.username, role: user.role });
  const response = NextResponse.json({ role: user.role });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
