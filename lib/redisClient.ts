import Redis from "ioredis";

let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL environment variable is not set");
    client = new Redis(url);
  }
  return client;
}

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await getClient().get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  },
  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    const serialized = JSON.stringify(value);
    if (opts?.ex) {
      await getClient().set(key, serialized, "EX", opts.ex);
    } else {
      await getClient().set(key, serialized);
    }
  },
  async del(key: string): Promise<void> {
    await getClient().del(key);
  },
};
