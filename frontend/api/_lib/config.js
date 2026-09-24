const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : '';

export const ORIGIN = (process.env.ORIGIN || productionUrl || 'http://localhost:5173').replace(/\/+$/, '');
export const RP_ID = process.env.RP_ID || new URL(ORIGIN).hostname;
export const RP_NAME = process.env.RP_NAME || 'openGym';
export const ADMIN_UIDS = (process.env.ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
export const INVITE_ONLY = /^(1|true|yes|on)$/i.test(process.env.INVITE_ONLY || '');
export const SESSION_DAYS = Math.max(1, +(process.env.SESSION_DAYS || 90) || 90);
export const SECURE = /^https:/i.test(ORIGIN) ? ' Secure;' : '';
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || (SECURE ? ORIGIN : 'mailto:admin@localhost');
export const CRON_SECRET = process.env.CRON_SECRET || '';
export const MAX_BODY = 4 * 1024 * 1024;
export const REST_MAX_SEC = 285;
export const REMINDER_WINDOW_MIN = 15;
