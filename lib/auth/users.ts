import { kv as vercelKv } from "@vercel/kv";
import bcrypt from "bcryptjs";
import type { User, UserRole } from "../types";

interface KvClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

let kvClient: KvClient = vercelKv;

// Test-only seam: lets lib/auth/users.test.ts inject an in-memory fake so
// unit tests don't require a real Vercel KV connection.
export function __setKvClientForTests(client: KvClient): void {
  kvClient = client;
}

const USERS_INDEX_KEY = "users:index";
const userKey = (username: string) => `users:${username}`;

async function getIndex(): Promise<string[]> {
  return (await kvClient.get<string[]>(USERS_INDEX_KEY)) ?? [];
}

async function saveIndex(usernames: string[]): Promise<void> {
  await kvClient.set(USERS_INDEX_KEY, usernames);
}

export async function listUsers(): Promise<User[]> {
  const usernames = await getIndex();
  const users = await Promise.all(usernames.map((u) => kvClient.get<User>(userKey(u))));
  return users.filter((u): u is User => u !== null);
}

export async function getUser(username: string): Promise<User | null> {
  return kvClient.get<User>(userKey(username));
}

export async function createUser(input: {
  username: string;
  password: string;
  role: UserRole;
}): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user: User = { username: input.username, passwordHash, role: input.role };
  await kvClient.set(userKey(user.username), user);

  const index = await getIndex();
  if (!index.includes(user.username)) {
    await saveIndex([...index, user.username]);
  }
  return user;
}

export async function updateUser(
  username: string,
  changes: { password?: string; role?: UserRole }
): Promise<User | null> {
  const existing = await getUser(username);
  if (!existing) return null;

  const updated: User = {
    ...existing,
    role: changes.role ?? existing.role,
    passwordHash: changes.password
      ? await bcrypt.hash(changes.password, 10)
      : existing.passwordHash,
  };
  await kvClient.set(userKey(username), updated);
  return updated;
}

export async function deleteUser(username: string): Promise<void> {
  await kvClient.del(userKey(username));
  const index = await getIndex();
  await saveIndex(index.filter((u) => u !== username));
}

export async function verifyPassword(
  username: string,
  password: string
): Promise<User | null> {
  const user = await getUser(username);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

// Called once at deploy time (or lazily on first login attempt) so the app
// always has at least one admin account, seeded from env vars.
export async function ensureSeedAdmin(): Promise<void> {
  const seedUsername = process.env.SEED_ADMIN_USERNAME;
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedUsername || !seedPassword) return;

  const existing = await getUser(seedUsername);
  if (existing) return;
  await createUser({ username: seedUsername, password: seedPassword, role: "admin" });
}
