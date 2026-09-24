import { kv, K } from './store.js';
import { sendPush } from './push.js';
import { REMINDER_WINDOW_MIN } from './config.js';

export function effectiveRoutineId(S, iso) {
  const ov = S.dayPlan?.[iso];
  if (ov === 'rest') return null;
  if (ov && S.routines?.some(r => r.id === ov)) return ov;
  const wd = new Date(iso + 'T12:00:00').getDay();
  return S.week?.[wd] || null;
}

export function userNow(tz, at = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).formatToParts(at);
    const g = t => parts.find(p => p.type === t)?.value;
    return { date: `${g('year')}-${g('month')}-${g('day')}`, hhmm: `${g('hour')}:${g('minute')}` };
  } catch { return null; }
}

const minutes = hhmm => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  return m ? +m[1] * 60 + +m[2] : NaN;
};

export function reminderDue(S, at = new Date()) {
  if (!S?.reminder?.on) return null;
  const now = userNow(S.reminder.tz || 'UTC', at);
  if (!now) return null;
  const late = minutes(now.hhmm) - minutes(S.reminder.time || '08:00');
  if (!(late >= 0 && late < REMINDER_WINDOW_MIN)) return null;
  if ((S.workouts || []).some(w => w.d === now.date)) return null;
  const rid = effectiveRoutineId(S, now.date);
  if (!rid) return null;
  return { date: now.date, routine: (S.routines || []).find(r => r.id === rid) || null };
}

export async function runReminders() {
  const uids = await kv().smembers(K.users);
  let sent = 0;
  for (const uid of uids) {
    if (!(await kv().hlen(K.subs(uid)))) continue;
    const [user, S] = await kv().mget(K.user(uid), K.state(uid));
    if (!user || user.disabled) continue;
    const due = reminderDue(S);
    if (!due) continue;
    const claimed = await kv().set(K.reminded(uid, due.date), { at: Date.now() }, { nx: true, ex: 2 * 86400 });
    if (!claimed) continue;
    console.log('reminder firing', uid, due.routine?.id);
    await sendPush(uid, {
      title: due.routine ? `${due.routine.emoji || '🏋️'} ${due.routine.name} today` : 'Workout planned today',
      body: "It's on your plan — let's go 💪",
      tag: 'day-reminder'
    });
    sent++;
  }
  return sent;
}
