import { Redis } from "@upstash/redis";

export function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function pinOk(req) {
  return Boolean(process.env.APP_PIN) && (req.body?.pin === process.env.APP_PIN || req.headers["x-app-pin"] === process.env.APP_PIN);
}

export const REMINDERS_KEY = "reminders";
export const SUBS_KEY = "push:subs";
