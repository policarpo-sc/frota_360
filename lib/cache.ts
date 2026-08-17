import { kv } from "./redisClient";

const DEFAULT_TTL_SECONDS = 15 * 60;

export async function getCached<T>(key: string): Promise<T | null> {
  return kv.get<T>(key);
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  await kv.set(key, value, { ex: ttlSeconds });
}
