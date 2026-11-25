# Project Blueprint: an instant project-scoping wizard for Cynbit

> Submission for the **Cynbit Full Stack Developer Intern** technical assessment: *Improve Cynbit's website*.
> Author: Aditi Yadav

**Live demo:** `<add your Vercel URL here>` · **Technical report:** [docs/TECHNICAL_REPORT.md](docs/TECHNICAL_REPORT.md)

## The problem

Cynbit's [contact page](https://cynbit.in/contact) promises: *"Tell us what you're building. Our team will analyze
your requirements and prepare a tailored strategic overview before we connect."* In practice it's a 5-field free-text
form. The visitor gets nothing back right away, and the team receives unstructured messages with no budget, scope or
urgency.

## The improvement

A guided **6-step Blueprint wizard** that keeps that promise instantly, plus a **lead dashboard** for the team.

| For the visitor | For Cynbit's team |
| --- | --- |
| One-click answers: project type, features, scale, timeline + design, budget | Every lead saved as structured data |
| **Live estimate** sidebar that updates with each answer | Automatic **0–100 lead score** (hot / warm / cold) with reasons |
| Instant blueprint: delivery phases (Cynbit's own 6-stage lifecycle), stack, team, timeline, ₹ cost range, budget/timeline fit, recommendations, risks | Search, filter, sort, expandable blueprint detail |
| Download as PDF, and an unfinished draft resumes after a reload | Pipeline status (new → contacted → qualified → won/lost) and CSV export |

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Zod · PostgreSQL (`postgres.js`) · Vitest · Vercel

## Run locally

```bash
npm install
cp .env.example .env.local   # optional; works with zero config
npm run dev                  # http://localhost:3000
```

* Without `DATABASE_URL`, leads are stored in `.data/leads.json` (git-ignored).
* Team dashboard: `http://localhost:3000/admin`. The password is `ADMIN_PASSWORD`, which defaults to `cynbit-demo`.

```bash
npm test          # unit tests for the estimation engine, lead scoring and validation
npm run lint
npm run build
```

## Deploy (Vercel + Postgres)

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. Add a free Postgres database (Vercel Storage → **Neon**, or [neon.tech](https://neon.tech)). This sets `DATABASE_URL`.
3. Add the environment variables `ADMIN_PASSWORD` and `SESSION_SECRET` (a long random string).
4. Deploy. The `leads` table is created automatically on the first request.

> A database is required in production: Vercel's filesystem is read-only, so the JSON fallback only works locally.

## API

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/leads` | public (rate-limited, honeypot) | Validate answers, generate the blueprint server-side, score and store the lead |
| `GET` | `/api/leads[?format=csv]` | admin | List leads as JSON or CSV |
| `PATCH` | `/api/leads/:id` | admin | Update pipeline status |
| `POST` / `DELETE` | `/api/admin/session` | — | Log in / log out (HMAC-signed httpOnly cookie) |

## Project structure

```
src/
  app/
    page.tsx                  landing page: the problem and the before/after
    blueprint/page.tsx        the wizard
    admin/page.tsx            team dashboard (login, or the leads table)
    api/leads/…               lead capture, listing, CSV export, status updates
    api/admin/session/…       admin login/logout
  components/
    Wizard.tsx                6-step wizard, live estimate, draft persistence
    BlueprintView.tsx         blueprint rendering (shared by visitor and admin)
    admin/…                   dashboard and login form
  lib/
    blueprint/options.ts      catalog of choices and effort/cost assumptions (one data file)
    blueprint/engine.ts       pure estimation and lead-scoring logic
    blueprint/schema.ts       Zod schemas shared by client and server
    blueprint/engine.test.ts  Vitest unit tests
    store.ts                  LeadStore interface: Postgres, or a JSON file for local dev
    auth.ts, rate-limit.ts    admin session, per-IP rate limiting
```

*Prototype only. Not an official Cynbit page. Estimates are indicative.*
