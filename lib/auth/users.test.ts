import { describe, it, expect, beforeEach } from "vitest";
import {
  __setKvClientForTests,
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  verifyPassword,
} from "./users";

class FakeKv {
  private store = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }
  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

beforeEach(() => {
  __setKvClientForTests(new FakeKv());
});

describe("user store", () => {
  it("creates a user with a hashed password and lists it", async () => {
    await createUser({ username: "jsl_viewer", password: "senha123", role: "viewer" });
    const users = await listUsers();
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe("jsl_viewer");
    expect(users[0].passwordHash).not.toBe("senha123");
  });

  it("verifies a correct password and rejects a wrong one", async () => {
    await createUser({ username: "admin1", password: "correcthorse", role: "admin" });
    expect(await verifyPassword("admin1", "correcthorse")).toMatchObject({
      username: "admin1",
      role: "admin",
    });
    expect(await verifyPassword("admin1", "wrongpass")).toBeNull();
  });

  it("returns null verifying a non-existent user", async () => {
    expect(await verifyPassword("ghost", "whatever")).toBeNull();
  });

  it("updates a user's role and password", async () => {
    await createUser({ username: "u1", password: "pass1", role: "viewer" });
    await updateUser("u1", { role: "admin", password: "pass2" });
    const user = await getUser("u1");
    expect(user?.role).toBe("admin");
    expect(await verifyPassword("u1", "pass2")).not.toBeNull();
  });

  it("deletes a user", async () => {
    await createUser({ username: "temp", password: "pass", role: "viewer" });
    await deleteUser("temp");
    expect(await getUser("temp")).toBeNull();
  });
});
