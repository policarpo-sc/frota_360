import { describe, it, expect, beforeAll } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-at-least-32-bytes-long!!";
});

describe("session tokens", () => {
  it("round-trips a valid payload", async () => {
    const token = await createSessionToken({ username: "carlos", role: "admin" });
    const payload = await verifySessionToken(token);
    expect(payload).toMatchObject({ username: "carlos", role: "admin" });
  });

  it("returns null for a tampered token", async () => {
    const token = await createSessionToken({ username: "carlos", role: "admin" });
    const tampered = token.slice(0, -2) + "xx";
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("returns null for garbage input", async () => {
    expect(await verifySessionToken("not-a-token")).toBeNull();
  });
});
