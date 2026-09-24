import crypto from 'node:crypto';
import { Redis } from '@upstash/redis';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

let client;
export function kv() {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new HttpError(503, 'storage is not set up — connect an Upstash Redis database to this Vercel project');
  client = new Redis({ url, token });
  return client;
}

export const K = {
  users: 'og:users',
  user: id => 'og:user:' + id,
  cred: id => 'og:cred:' + id,
  state: id => 'og:state:' + id,
  subs: id => 'og:subs:' + id,
  endpoint: hash => 'og:endpoint:' + hash,
  invites: 'og:invites',
  invite: code => 'og:invite:' + code,
  inviteClaim: code => 'og:invite-claim:' + code,
  challenge: cid => 'og:challenge:' + cid,
  presence: id => 'og:presence:' + id,
  rest: id => 'og:rest:' + id,
  reminded: (id, date) => 'og:reminded:' + id + ':' + date,
  secret: 'og:meta:secret',
  vapid: 'og:meta:vapid'
};

export async function getOrCreate(key, make) {
  const existing = await kv().get(key);
  if (existing) return existing;
  await kv().set(key, make(), { nx: true });
  return kv().get(key);
}

let sessionSecret;
export async function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!sessionSecret) sessionSecret = (await getOrCreate(K.secret, () => ({ key: crypto.randomBytes(32).toString('hex') }))).key;
  return sessionSecret;
}
