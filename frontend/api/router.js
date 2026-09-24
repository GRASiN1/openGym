import crypto from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse
} from '@simplewebauthn/server';
import { kv, K, secret, HttpError } from './_lib/store.js';
import { vapidKeys, endpointHash, sendPush } from './_lib/push.js';
import { runReminders } from './_lib/reminders.js';
import {
  ORIGIN, RP_ID, RP_NAME, ADMIN_UIDS, INVITE_ONLY, SESSION_DAYS, SECURE,
  CRON_SECRET, MAX_BODY, REST_MAX_SEC
} from './_lib/config.js';

const isAdmin = user => !!user && (user.admin === true || ADMIN_UIDS.includes(user.id));
const publicUser = user => ({ id: user.id, name: user.name, admin: isAdmin(user) });
const b64uToBuf = s => Buffer.from(s, 'base64url');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const validId = s => typeof s === 'string' && s.length > 0 && s.length <= 1024;
const inviteCode = s => String(s || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40);

function json(code, obj, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status: code,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(extraHeaders || {}) }
  });
}

async function readBody(req) {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'body too large');
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'bad json'); }
}

async function hmac(payload) {
  return crypto.createHmac('sha256', await secret()).update(payload).digest('base64url');
}
async function verifySig(token) {
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const payload = token.slice(0, i), mac = token.slice(i + 1);
  const expect = await hmac(payload);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
  } catch { return null; }
  return payload;
}
const sessionVersion = user => user.sv || 0;
async function sessionCookie(user) {
  const payload = user.id + ':' + (Date.now() + SESSION_DAYS * 86400000) + ':' + sessionVersion(user);
  return `gymsid=${payload}.${await hmac(payload)}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly;${SECURE} SameSite=Lax`;
}
const clearCookie = `gymsid=; Path=/; Max-Age=0; HttpOnly;${SECURE} SameSite=Lax`;

function readCookies(req) {
  return Object.fromEntries((req.headers.get('cookie') || '').split(';').map(c => {
    const i = c.indexOf('='); return i < 0 ? ['', ''] : [c.slice(0, i).trim(), c.slice(i + 1).trim()];
  }));
}
async function readSession(req) {
  const tok = readCookies(req).gymsid;
  if (!tok) return null;
  const payload = await verifySig(tok);
  if (!payload) return null;
  const [uid, exp, ver] = payload.split(':');
  if (!uid || +exp < Date.now()) return null;
  const user = await kv().get(K.user(uid));
  if (!user || user.disabled) return null;
  const claimed = ver === undefined ? 0 : Number(ver);
  if (!Number.isInteger(claimed) || claimed !== sessionVersion(user)) return null;
  return user;
}

const authed = handler => async (req, url) => {
  const user = await readSession(req);
  if (!user) return json(401, { error: 'not signed in' });
  return handler(req, user, url);
};
const adminOnly = handler => async (req, url) => {
  const user = await readSession(req);
  if (!user) return json(401, { error: 'not signed in' });
  if (!isAdmin(user)) return json(403, { error: 'forbidden' });
  return handler(req, user, url);
};

async function putChallenge(data) {
  const cid = crypto.randomBytes(16).toString('base64url');
  await kv().set(K.challenge(cid), data, { ex: 300 });
  return cid;
}
const takeChallenge = cid => validId(cid) ? kv().getdel(K.challenge(cid)) : null;

async function openInvite(code) {
  if (!code) return null;
  const invite = await kv().get(K.invite(code));
  return invite && !invite.usedBy && !invite.revoked ? invite : null;
}

const REST_CAS = `
local cur = redis.call('GET', KEYS[1])
if cur then
  local ok, c = pcall(cjson.decode, cur)
  if ok and type(c) == 'table' and tonumber(c.at) and tonumber(c.at) >= tonumber(ARGV[1]) then return 0 end
end
redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
return 1`;
const restStamp = at => Number.isFinite(+at) && +at > 0 ? +at : Date.now();
const writeRest = async (uid, entry) => (await kv().eval(REST_CAS, [K.rest(uid)], [String(entry.at), JSON.stringify(entry), '900'])) === 1;

async function runRestTimer(uid, token, due) {
  try {
    for (;;) {
      const wait = due - Date.now();
      if (wait > 0) await sleep(Math.min(wait, 5000));
      const cur = await kv().get(K.rest(uid));
      if (cur?.token !== token) return;
      if (Date.now() >= due) break;
    }
    await sendPush(uid, { title: 'Rest over 💪', body: 'Time for your next set.', tag: 'rest-timer' });
  } catch (e) { console.error('rest timer failed', uid, e); }
}

function cronAuthorized(req) {
  if (!CRON_SECRET) return false;
  const given = crypto.createHash('sha256').update(req.headers.get('authorization') || '').digest();
  const expect = crypto.createHash('sha256').update('Bearer ' + CRON_SECRET).digest();
  return crypto.timingSafeEqual(given, expect);
}

const routes = {
  'GET /api/health': async () => json(200, { ok: true, users: await kv().scard(K.users) }),

  'GET /api/config': async () => json(200, { invite_only: INVITE_ONLY }),

  'GET /api/me': authed(async (req, user) => json(200, { user: publicUser(user) })),

  'POST /api/register/options': async req => {
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 40);
    if (!name) return json(400, { error: 'name required' });
    const code = inviteCode(body.code);
    if (INVITE_ONLY && !(await openInvite(code))) return json(403, { error: 'a valid invite code is required' });
    const uid = crypto.randomBytes(12).toString('base64url');
    const options = await generateRegistrationOptions({
      rpName: RP_NAME, rpID: RP_ID,
      userID: Buffer.from(uid), userName: name, userDisplayName: name,
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
      excludeCredentials: []
    });
    const cid = await putChallenge({ challenge: options.challenge, name, uid, code });
    return json(200, { cid, options });
  },

  'POST /api/register/verify': async req => {
    const body = await readBody(req);
    const c = await takeChallenge(body.cid);
    if (!c || !c.uid) return json(400, { error: 'challenge expired — try again' });
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.credential,
        expectedChallenge: c.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false
      });
    } catch (e) { return json(400, { error: 'verification failed: ' + e.message }); }
    if (!verification.verified) return json(400, { error: 'not verified' });
    const { credential } = verification.registrationInfo;
    if (await kv().exists(K.cred(credential.id))) return json(409, { error: 'credential already registered' });
    const user = { id: c.uid, name: c.name, created: new Date().toISOString() };
    if (INVITE_ONLY) {
      const invite = await openInvite(c.code);
      const claimed = invite && await kv().set(K.inviteClaim(c.code), { uid: user.id }, { nx: true });
      if (!claimed) return json(403, { error: 'invite code is no longer valid — ask for a new one' });
      user.invitedBy = invite.code;
      await kv().set(K.invite(invite.code), { ...invite, usedBy: user.id, usedAt: user.created });
    }
    await kv().set(K.user(user.id), user);
    await kv().sadd(K.users, user.id);
    await kv().set(K.cred(credential.id), {
      id: credential.id, userId: user.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter || 0,
      transports: body.credential?.response?.transports || []
    });
    return json(200, { user: publicUser(user) }, { 'Set-Cookie': await sessionCookie(user) });
  },

  'POST /api/login/options': async () => {
    const options = await generateAuthenticationOptions({
      rpID: RP_ID, userVerification: 'preferred', allowCredentials: []
    });
    const cid = await putChallenge({ challenge: options.challenge });
    return json(200, { cid, options });
  },

  'POST /api/login/verify': async req => {
    const body = await readBody(req);
    const c = await takeChallenge(body.cid);
    if (!c) return json(400, { error: 'challenge expired — try again' });
    const cred = validId(body.credential?.id) ? await kv().get(K.cred(body.credential.id)) : null;
    if (!cred) return json(404, { error: 'unknown passkey — create a profile first' });
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body.credential,
        expectedChallenge: c.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
        credential: {
          id: cred.id,
          publicKey: b64uToBuf(cred.publicKey),
          counter: cred.counter,
          transports: cred.transports
        }
      });
    } catch (e) { return json(400, { error: 'verification failed: ' + e.message }); }
    if (!verification.verified) return json(400, { error: 'not verified' });
    await kv().set(K.cred(cred.id), { ...cred, counter: verification.authenticationInfo.newCounter });
    const user = await kv().get(K.user(cred.userId));
    if (!user) return json(500, { error: 'user missing' });
    if (user.disabled) return json(403, { error: 'this account has been disabled' });
    return json(200, { user: publicUser(user) }, { 'Set-Cookie': await sessionCookie(user) });
  },

  'POST /api/logout': async () => json(200, { ok: true }, { 'Set-Cookie': clearCookie }),

  'POST /api/logout/all': authed(async (req, user) => {
    await kv().set(K.user(user.id), { ...user, sv: sessionVersion(user) + 1 });
    return json(200, { ok: true }, { 'Set-Cookie': clearCookie });
  }),

  'GET /api/data': authed(async (req, user) => json(200, { state: (await kv().get(K.state(user.id))) || null })),

  'PUT /api/data': authed(async (req, user) => {
    const body = await readBody(req);
    if (!body.state || typeof body.state !== 'object') return json(400, { error: 'state required' });
    delete body.state.active;
    await kv().set(K.state(user.id), body.state);
    return json(200, { ok: true, ts: body.state._ts || null });
  }),

  'GET /api/push/public-key': async () => json(200, { key: (await vapidKeys()).publicKey }),

  'POST /api/push/subscribe': authed(async (req, user) => {
    const body = await readBody(req);
    const sub = body.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json(400, { error: 'invalid subscription' });
    const hash = endpointHash(sub.endpoint);
    const owner = await kv().get(K.endpoint(hash));
    if (owner?.uid && owner.uid !== user.id) await kv().hdel(K.subs(owner.uid), hash);
    await kv().hset(K.subs(user.id), { [hash]: { endpoint: sub.endpoint, keys: sub.keys, created: new Date().toISOString() } });
    await kv().set(K.endpoint(hash), { uid: user.id });
    return json(200, { ok: true });
  }),

  'POST /api/push/unsubscribe': authed(async (req, user) => {
    const body = await readBody(req);
    const hash = endpointHash(body.endpoint);
    await kv().hdel(K.subs(user.id), hash);
    const owner = await kv().get(K.endpoint(hash));
    if (owner?.uid === user.id) await kv().del(K.endpoint(hash));
    return json(200, { ok: true });
  }),

  'POST /api/push/test': authed(async (req, user) => {
    await sendPush(user.id, { title: 'openGym', body: 'Test notification ✅ — this is what alerts look like.', tag: 'test' });
    return json(200, { ok: true });
  }),

  'POST /api/push/rest-timer': authed(async (req, user) => {
    const body = await readBody(req);
    const sec = Math.max(1, Math.min(REST_MAX_SEC, Math.round(+body.seconds || 0)));
    if (!(await kv().hlen(K.subs(user.id)))) return json(200, { ok: true });
    const entry = { at: restStamp(body.at), token: crypto.randomBytes(9).toString('base64url'), due: Date.now() + sec * 1000 };
    if (await writeRest(user.id, entry)) waitUntil(runRestTimer(user.id, entry.token, entry.due));
    return json(200, { ok: true });
  }),

  'POST /api/push/rest-timer/cancel': authed(async (req, user) => {
    const body = await readBody(req);
    await writeRest(user.id, { at: restStamp(body.at), cancelled: true });
    return json(200, { ok: true });
  }),

  'POST /api/activity': authed(async (req, user) => {
    const body = await readBody(req);
    if (body.active) {
      await kv().set(K.presence(user.id), {
        name: String(body.name || '').slice(0, 60),
        exIdx: +body.exIdx || 0, exTotal: +body.exTotal || 0,
        setsDone: +body.setsDone || 0, setsTotal: +body.setsTotal || 0,
        startedAt: +body.startedAt || Date.now(),
        updatedAt: Date.now()
      }, { ex: 70 });
    } else await kv().del(K.presence(user.id));
    return json(200, { ok: true });
  }),

  'GET /api/cron/reminders': async req => {
    if (!cronAuthorized(req)) return json(401, { error: 'unauthorized' });
    return json(200, { ok: true, sent: await runReminders() });
  },

  'GET /api/admin/users': adminOnly(async () => {
    const ids = await kv().smembers(K.users);
    if (!ids.length) return json(200, { users: [], invite_only: INVITE_ONLY, now: Date.now() });
    const [users, states, presence] = await Promise.all([
      kv().mget(...ids.map(K.user)),
      kv().mget(...ids.map(K.state)),
      kv().mget(...ids.map(K.presence))
    ]);
    const pushCounts = await Promise.all(ids.map(id => kv().hlen(K.subs(id))));
    const rows = ids.map((id, i) => {
      const u = users[i];
      if (!u) return null;
      const S = states[i] || {};
      const workouts = S.workouts || [];
      const last = workouts[workouts.length - 1];
      return {
        id: u.id, name: u.name, created: u.created || null,
        disabled: !!u.disabled, admin: isAdmin(u), invitedBy: u.invitedBy || null,
        workouts: workouts.length,
        lastWorkout: last ? last.d : null,
        lastSync: S._ts || null,
        hasPush: pushCounts[i] > 0,
        live: presence[i] || null
      };
    }).filter(Boolean).sort((a, b) => String(a.created).localeCompare(String(b.created)));
    return json(200, { users: rows, invite_only: INVITE_ONLY, now: Date.now() });
  }),

  'GET /api/admin/user': adminOnly(async (req, admin, url) => {
    const id = url.searchParams.get('id');
    const u = validId(id) ? await kv().get(K.user(id)) : null;
    if (!u) return json(404, { error: 'no such user' });
    const S = (await kv().get(K.state(u.id))) || {};
    return json(200, {
      user: { id: u.id, name: u.name, created: u.created || null, disabled: !!u.disabled, admin: isAdmin(u), invitedBy: u.invitedBy || null },
      unit: S.unit || 'kg',
      lastSync: S._ts || null,
      routines: (S.routines || []).map(r => ({ id: r.id, name: r.name, emoji: r.emoji, count: (r.ex || []).length })),
      bodyweight: S.bodyweight || [],
      workouts: (S.workouts || []).slice().reverse()
    });
  }),

  'POST /api/admin/user/disable': adminOnly(async req => {
    const body = await readBody(req);
    const u = validId(body.id) ? await kv().get(K.user(body.id)) : null;
    if (!u) return json(404, { error: 'no such user' });
    if (isAdmin(u)) return json(400, { error: 'cannot disable an admin' });
    const disabled = !!body.disabled;
    await kv().set(K.user(u.id), { ...u, disabled });
    if (disabled) await kv().del(K.presence(u.id));
    return json(200, { ok: true, id: u.id, disabled });
  }),

  'GET /api/admin/invites': adminOnly(async () => {
    const codes = await kv().smembers(K.invites);
    const list = codes.length ? (await kv().mget(...codes.map(K.invite))).filter(Boolean) : [];
    const usedIds = [...new Set(list.map(i => i.usedBy).filter(Boolean))];
    const names = usedIds.length ? await kv().mget(...usedIds.map(K.user)) : [];
    const nameOf = Object.fromEntries(usedIds.map((id, i) => [id, names[i]?.name || null]));
    const invites = list
      .sort((a, b) => String(a.created).localeCompare(String(b.created)))
      .map(i => ({ ...i, usedByName: i.usedBy ? nameOf[i.usedBy] || null : null }));
    return json(200, { invites, invite_only: INVITE_ONLY });
  }),

  'POST /api/admin/invites/new': adminOnly(async (req, admin) => {
    const body = await readBody(req);
    const invite = { code: '', note: String(body.note || '').slice(0, 60), createdBy: admin.id, created: new Date().toISOString() };
    do { invite.code = crypto.randomBytes(8).toString('hex').toUpperCase(); }
    while (!(await kv().set(K.invite(invite.code), invite, { nx: true })));
    await kv().sadd(K.invites, invite.code);
    return json(200, { invite });
  }),

  'POST /api/admin/invites/revoke': adminOnly(async req => {
    const body = await readBody(req);
    const code = inviteCode(body.code);
    const inv = code ? await kv().get(K.invite(code)) : null;
    if (!inv) return json(404, { error: 'no such code' });
    if (inv.usedBy) return json(400, { error: 'already used — cannot revoke' });
    await kv().del(K.invite(code));
    await kv().srem(K.invites, code);
    return json(200, { ok: true });
  })
};

async function handle(req) {
  const url = new URL(req.url);
  const routed = url.searchParams.get('__path');
  const pathname = routed !== null ? '/api/' + routed.replace(/^\/+|\/+$/g, '') : url.pathname.replace(/\/+$/, '');
  const key = req.method + ' ' + pathname;
  const handler = routes[key];
  if (!handler) return json(404, { error: 'not found' });
  try { return await handler(req, url); }
  catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message });
    console.error(key, e);
    return json(500, { error: 'server error' });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
