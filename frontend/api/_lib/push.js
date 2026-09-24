import crypto from 'node:crypto';
import webpush from 'web-push';
import { kv, K, getOrCreate } from './store.js';
import { VAPID_SUBJECT } from './config.js';

let vapid;
export async function vapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  if (!vapid) vapid = await getOrCreate(K.vapid, () => webpush.generateVAPIDKeys());
  return vapid;
}

export const endpointHash = endpoint => crypto.createHash('sha256').update(String(endpoint)).digest('base64url').slice(0, 32);

export async function sendPush(userId, payload) {
  const subs = await kv().hgetall(K.subs(userId));
  if (!subs) return 0;
  const { publicKey, privateKey } = await vapidKeys();
  const body = JSON.stringify(payload);
  const results = await Promise.all(Object.entries(subs).map(async ([hash, sub]) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, {
        urgency: 'high',
        vapidDetails: { subject: VAPID_SUBJECT, publicKey, privateKey }
      });
      return 1;
    } catch (e) {
      console.error('push send failed', userId, e.statusCode, e.body || e.message);
      if (e.statusCode === 404 || e.statusCode === 410) {
        await kv().hdel(K.subs(userId), hash);
        const owner = await kv().get(K.endpoint(hash));
        if (owner?.uid === userId) await kv().del(K.endpoint(hash));
      }
      return 0;
    }
  }));
  return results.reduce((a, b) => a + b, 0);
}
