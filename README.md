# Water Testing Enquiry Tracker

Small Next.js app that replaces the Excel "Water test Tracker" sheet for Water Store Kerala. Each agent signs in and only sees their own enquiries; the admin sees everything and manages users.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript)
- **Tailwind CSS** + **shadcn/ui**
- **Drizzle ORM** + **Neon Postgres** (via `@neondatabase/serverless`)
- **Auth.js v5** (Credentials provider, JWT cookie sessions, bcryptjs)

## Domain (mirrors the spreadsheet)

- **Districts (14):** Thiruvananthapuram, Kollam, Pathanamthitta, Alappuzha, Kottayam, Idukki, Ernakulam, Thrissur, Palakkad, Malappuram, Kozhikode, Wayanad, Kannur, Kasaragod
- **Water source:** Borewell, Open Well, Tap Water, River, Tank, Other
- **Status pipeline:** Confirmed → Ongoing → Collected → Received at Lab → Result Ready (Cancelled at any point)
- **Payment modes:** Direct, AV GPay, Aquagrand, Water Store, Cash

## Prerequisites

- Node.js 20 or 22 (install from <https://nodejs.org>)
- A Neon project — grab the **pooled** connection string from the dashboard
- A Vercel account (for deployment)

## Local setup

```bash
# 1. Install deps
npm install

# 2. Configure environment
cp .env.example .env
# then edit .env and set DATABASE_URL and AUTH_SECRET
#   AUTH_SECRET: openssl rand -base64 32
#   (or any 32+ char random string)

# 3. Push the schema to Neon
npm run db:push

# 4. Seed the first admin (uses SEED_ADMIN_* from .env)
npm run db:seed

# 5. Run dev server
npm run dev
```

Open <http://localhost:3000> and sign in with the seeded admin email/password. From `/admin/users` you can create logins for each agent.

## Deploying to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. Go to <https://vercel.com/new> and import the repo. Framework should auto-detect as Next.js.
3. Add environment variables in **Project Settings → Environment Variables**:
   - `DATABASE_URL` — Neon pooled connection string
   - `AUTH_SECRET` — same random value used locally (or a fresh one)
4. Deploy. Vercel will run `next build`.
5. After the first deploy, run the seeder once locally pointed at production (`npm run db:seed` with prod `DATABASE_URL` exported), or sign in with any admin you create directly in the DB.

## Access rules (enforced server-side)

- Middleware (`src/middleware.ts`) redirects unauthenticated visitors to `/login`.
- Every list / detail / mutation query filters by `agentId = session.user.id` unless `role = 'admin'`.
- `/admin/users` is admin-only — checked in the page and in the user-management server actions.

## Files of interest

| Path | What it does |
| --- | --- |
| [auth.ts](auth.ts) | Auth.js v5 config (credentials, JWT, role on session) |
| [src/lib/schema.ts](src/lib/schema.ts) | Drizzle schema for `users` and `enquiries` |
| [src/lib/validators.ts](src/lib/validators.ts) | Zod schemas for forms |
| [src/app/actions/enquiries.ts](src/app/actions/enquiries.ts) | create / update / delete with per-row authorization |
| [src/app/actions/users.ts](src/app/actions/users.ts) | admin-only user management |
| [src/app/(app)/dashboard/page.tsx](src/app/(app)/dashboard/page.tsx) | KPIs (scoped to current user unless admin) |
| [src/app/(app)/enquiries/page.tsx](src/app/(app)/enquiries/page.tsx) | list with search + status filter |

## Notes

- Dates are stored as Postgres `date` and rendered with `Intl.DateTimeFormat('en-IN')`.
- The Excel sheet's `Sl. No.` column is omitted — the database autoincrement `id` plays the same role.
- Agent name is stored on each enquiry (denormalized) so admins can group by agent even after a user is deleted.
- If you want to import the existing rows from the spreadsheet, ask and I'll add a one-shot import script.
