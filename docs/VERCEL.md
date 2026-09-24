# Hosting openGym on Vercel (free, no server of your own)

This runs the whole app — passkey sign-in, sync across devices, push notifications, admin
dashboard — on Vercel's free **Hobby** plan, with your data in a free **Upstash Redis**
database added from the Vercel dashboard. Nothing has to stay running on your own machine.

| Piece | Where it runs |
|-------|---------------|
| The app (HTML/JS) | Vercel static hosting |
| The API (`frontend/api/`) | One Vercel Function |
| Your data | Upstash Redis (Vercel Marketplace, free tier) |
| Exercise images & GIFs | jsDelivr CDN, straight from the upstream dataset |
| Workout-day reminder *(optional)* | A free external pinger such as cron-job.org |

The Docker setup keeps working unchanged — this is an additional way to run the same code.

## 1. Fork the repo

Fork it to your **personal** GitHub account. Vercel's Hobby plan can't import repos owned by a
GitHub organization.

## 2. Create the Vercel project

1. [vercel.com/new](https://vercel.com/new) → import your fork.
2. **Root Directory: `frontend`** — this is the one setting that matters. Everything else
   (build command, output folder, the API function) comes from `frontend/vercel.json`.
3. Deploy. The first deploy will show the app, but sign-in won't work until step 3.

## 3. Add the database

1. In the project: **Storage → Create Database → Upstash for Redis** (free plan) → connect it
   to the project for all environments.
2. **Deployments → ⋯ → Redeploy** so the function picks up the new variables.
3. Open `https://<your-project>.vercel.app/api/health` — you should see `{"ok":true,"users":0}`.

The integration adds `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN`); either pair works.

## 4. Put it on your iPhone

1. Open `https://<your-project>.vercel.app` in **Safari**.
2. **Share → Add to Home Screen**, then open openGym from the home screen icon.
3. **Create new profile** → confirm with Face ID. The passkey is saved in iCloud Keychain, so
   it also works on your Mac or iPad.
4. For rest-timer alerts and workout reminders: **Settings → Push notifications** inside the
   app. iOS only allows web push for apps opened from the home screen (iOS 16.4+).

Use the short production URL (`<your-project>.vercel.app` or your custom domain), not the long
per-deployment URLs Vercel also shows — passkeys are tied to one exact hostname.

## 5. Close sign-ups (recommended)

The URL is public, so anyone who finds it could create a profile on your database. Once your own
profile exists:

1. **Settings → Environment Variables** → add `INVITE_ONLY` = `1`.
2. Redeploy.

New profiles now need an invite code. To invite someone later, open
`https://<your-project>.vercel.app/api/me` while signed in, copy your `id`, add it as
`ADMIN_UIDS`, redeploy, and generate codes from **Settings → Admin dashboard** in the app.

## 6. Workout-day reminder (optional)

Vercel's free plan only runs its own scheduled jobs once a day, so the reminder is triggered
from outside instead:

1. Generate a secret, e.g. `openssl rand -hex 32`, and add it as `CRON_SECRET`. Redeploy.
2. On [cron-job.org](https://cron-job.org) (free), create a job:
   - URL: `https://<your-project>.vercel.app/api/cron/reminders`
   - Schedule: every 5 minutes
   - Header: `Authorization: Bearer <your secret>`

The reminder goes out within 15 minutes after the time you pick in the app, once per day, only on
days with a routine planned and nothing logged yet. Without `CRON_SECRET` the endpoint refuses
every call.

## Moving data from an existing instance

Passkeys can't move — they belong to the old hostname. In the old instance use
**Settings → Export backup (JSON)**, then create your profile here and use **Settings → Import backup** with that file.

The same applies if you later switch this deployment to a custom domain: export first, create a
new profile on the new domain, import.

## Environment variables

| Variable | What it does | Default |
|----------|--------------|---------|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Redis connection, set by the Upstash integration | — (required) |
| `INVITE_ONLY` | Require an invite code to create a profile | off |
| `ADMIN_UIDS` | Profile ids that get the admin dashboard (comma-separated) | none |
| `CRON_SECRET` | Enables `/api/cron/reminders` for the workout-day reminder | unset (disabled) |
| `ORIGIN` | Full URL the app is served from | `https://` + your production domain |
| `RP_ID` | Hostname passkeys are bound to | hostname of `ORIGIN` |
| `RP_NAME` | Name shown in the passkey prompt | `openGym` |
| `SESSION_DAYS` | How long a sign-in lasts | `90` |
| `SESSION_SECRET` | Cookie signing key | generated once, stored in Redis |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push keys | generated once, stored in Redis |

## Free-tier headroom

A personal instance stays far inside both free tiers:

- **Upstash** — 500K commands/month. One person training 4–5×/week with notifications on and the
  reminder pinger every 5 minutes uses roughly 50–100K.
- **Vercel Hobby** — deploys don't consume a quota the way they do on Netlify, and the function
  mostly sleeps while waiting on a rest timer, which isn't billed as active CPU.

## Differences from the Docker version

- A single rest-timer alert covers at most 4 min 45 s (Vercel Hobby functions stop after
  5 minutes). The in-app timer itself is unaffected.
- Vercel Hobby is for personal, non-commercial use.
