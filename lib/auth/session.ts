import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "../types";

export const SESSION_COOKIE_NAME = "frota360_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 hours

export interface SessionPayload {
  username: string;
  role: UserRole;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ username: payload.username, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.username !== "string" || typeof payload.role !== "string") {
      return null;
    }
    if (payload.role !== "admin" && payload.role !== "viewer") return null;
    return { username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}
