# Technical Report: Project Blueprint

**Assessment:** Full Stack Developer Intern, *Improve Cynbit's Website*
**Candidate:** Aditi Yadav
**Repository:** `<GitHub URL>` · **Live demo:** `<Vercel URL>`

---

## 1. Summary

I reviewed cynbit.in as a visitor and as a developer, and chose to improve the **project inquiry flow**, the step
where a visitor becomes a client lead. I replaced the free-text contact form with a **6-step Project Blueprint
wizard**. It gives visitors an instant, tailored plan (phases, stack, team, timeline and a ₹ budget range) and gives
Cynbit's team **structured, automatically scored leads** in a password-protected dashboard.

It is a full-stack prototype: a typed estimation engine, a validated REST API, a database layer, admin
authentication, unit tests, and a responsive, accessible UI.

## 2. Analysis of the current website

### 2.1 User perspective

| Observation | Impact |
| --- | --- |
| The `/contact` "Project Intelligence: The Blueprint" section promises to *"analyze your requirements and prepare a tailored strategic overview"*, but the form is just name, email, company, industry and a free-text message. | The value it promises isn't delivered. Visitors wait about 24h and have no idea whether Cynbit fits their budget or timeline. |
| The visitor has to compose a project description from scratch in an empty textarea. | High effort at the most important moment, so many visitors leave without sending anything. |
| A full-screen newsletter modal appears a few seconds after landing on the home page. | It interrupts first-time visitors before they have read anything. |
| The home page hero renders blank until its entrance animation runs. | The first impression is empty, and Largest Contentful Paint is likely worse. |

### 2.2 Developer / business perspective

| Observation | Impact |
| --- | --- |
| Leads arrive as unstructured text with no budget, timeline, scope or scale. | Sales has to read every message and reply just to qualify it. |
| There's no way to prioritise leads. | Hot leads wait in the same queue as low-intent ones. |
| Pages are already built on Next.js. | An improvement in the same stack can be adopted directly. |
| Measured on the home page: ~1.1 s TTFB, ~3.3 s load, 45 requests, ~338 KB transferred. | This is acceptable, and not the biggest lever for the business. |

### 2.3 Why I chose this improvement

Of the options I considered (an AI chat assistant, performance tuning, a case-study filter), the Blueprint wizard:

1. **Fixes a gap the site itself points out**: a feature the site advertises but doesn't deliver.
2. **Sits right at the conversion point**, where it has the most direct business impact.
3. **Exercises the whole stack**: UI and state, domain logic, API design, validation, persistence, auth and security.
4. **Needs no paid third-party APIs**, so the demo stays free and reliable.

## 3. Problem statement

> Visitors who want to start a project with Cynbit have to describe it in free text, and they get no immediate
> feedback on feasibility, cost or timeline. Cynbit receives unstructured leads it must qualify by hand.
> **Goal:** a guided scoping flow that (a) gives the visitor an instant, credible plan, and (b) captures a structured,
> prioritised lead for the team.

## 4. Solution overview

**Visitor flow** (`/blueprint`)

1. **Project type**: web app, mobile, AI automation, SaaS, e-commerce, or website + SEO
2. **Features** (multi-select, optional): auth, payments, admin dashboard, AI, analytics, integrations, real-time,
   uploads, notifications, i18n
3. **Scale**: MVP, growing business, or enterprise
4. **Timeline + design status**
5. **Budget range** (INR, including "Not sure yet")
6. **Contact**: name and email required; company, phone and notes optional

A **live estimate** sidebar updates as the visitor answers. On submit, the visitor immediately sees their blueprint:

* timeline range, ₹ investment range and team size
* **budget fit** (within / close / above) and **timeline fit**
* a **delivery roadmap** that follows Cynbit's own 6-stage lifecycle (Discovery → Strategy → Design → Implementation
  → QA → Deployment)
* a recommended tech stack, team roles, tailored recommendations (for example, phasing into an MVP when the budget is
  short) and risks to plan for
* a **Download PDF** button, which uses a print stylesheet

**Team flow** (`/admin`)

* Password login with an HMAC-signed, httpOnly session cookie
* KPI tiles: total leads, hot leads, average score, open pipeline value
* Leads table with search, hot/warm/cold filter, sorting, an expandable full blueprint, and the reasons behind each
  score
* Pipeline status updates (optimistic UI with rollback on failure) and CSV export

## 5. Technical stack and rationale

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16 (App Router), React 19** | It matches Cynbit's production stack, and one codebase covers the UI and the API routes. |
| Language | **TypeScript (strict)** | The answer types flow from the option catalog → engine → API → UI, so a typo is a compile error. |
| Styling | **Tailwind CSS 4** | Fast to iterate on, gives a consistent design system, and has no runtime cost. |
| Validation | **Zod 4** | One schema is shared by the client (inline errors) and the server (trust boundary). |
| Database | **PostgreSQL** via `postgres.js` | A relational row per lead plus a `jsonb` column for the blueprint snapshot. Free tier on Neon/Supabase. |
| Local storage | JSON-file adapter | `npm run dev` works with zero setup; the same `LeadStore` interface is used for both. |
| Testing | **Vitest** | Fast unit tests for the pure engine and the schemas. |
| Hosting | **Vercel** | Native Next.js support, with preview deploys on every push. |

## 6. Architecture

```
Browser                              Next.js server (Vercel)                   Storage
───────                              ───────────────────────                   ───────
Wizard (client)
 ├─ answers ─► engine.ts (live preview, same code as the server)
 └─ POST /api/leads ───────────────► rate limit → Zod validate → honeypot
                                     → generateBlueprint() (recomputed on the server)
                                     → scoreLead()
                                     → LeadStore.create() ───────────────────► Postgres `leads`
                                     ◄─ 201 { id, blueprint }                     (or .data/leads.json locally)
BlueprintView ◄─ blueprint

Admin dashboard ◄── server component: connection() → isAdmin() → LeadStore.list()
 ├─ PATCH /api/leads/:id ──────────► isAdmin → Zod → updateStatus()
 └─ GET /api/leads?format=csv ─────► isAdmin → CSV (formula-injection safe)
```

### Key design decisions

* **The engine is a pure function** (`generateBlueprint(answers) → Blueprint`). It is unit-testable and runs on both
  sides. The client uses it for the live preview, and the server **recomputes** the blueprint, so a tampered
  request can't plant fake estimates in the CRM.
* **Assumptions live in one data file** (`options.ts`): base effort per project type, effort per feature, scale
  multipliers and a blended cost per person-week. Sales can tune the pricing without touching the logic.
* **Storage behind an interface** (`LeadStore`). Postgres is used when `DATABASE_URL` is set, and the JSON file
  otherwise. Moving to Prisma, Supabase or a CRM webhook later only means writing a new adapter.
* **Blueprint snapshot stored as `jsonb`.** The lead keeps the exact plan the visitor saw, even if pricing
  assumptions change later.

### Estimation model (indicative)

```
effort (person-weeks) = (base[type] + Σ feature weeks + design weeks) × scale multiplier × 1.15 overhead
team size             = {MVP 2, growth 3, enterprise 4} (+1 if ASAP, capped at 5)
calendar weeks        = effort / team  →  range ×0.85 … ×1.2
cost (₹)              = effort × ₹35,000 per person-week  →  range ×0.85 … ×1.2
```

Budget fit compares this range to the visitor's budget band. If the scope doesn't fit, the engine suggests an MVP
phase and shows its cost.

### Lead scoring (0–100)

Points are given for budget fit (up to 30), deal size (up to 15), timeline (up to 10), scale (up to 10), company
provided (10), phone provided (5), detailed notes (10), a well-defined scope (5) and a business email domain (5).
**Hot ≥ 65, warm ≥ 40, cold < 40.** Each lead stores the reasons, so the score can be explained in the dashboard.

## 7. Security, reliability and accessibility

* **Input validation** on the server with Zod (enums, lengths, email and phone formats). Errors return as structured
  `422` responses.
* **Spam protection:** a hidden honeypot field (bots get a fake `201` and nothing is stored) plus per-IP rate limiting
  (5 leads/min, 10 login attempts/min).
* **Admin auth:** a constant-time password comparison, and an HMAC-SHA256-signed expiring token in an
  `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookie. All admin APIs check the session on the server.
* **CSV export** prefixes cells that start with `= + - @` to prevent spreadsheet formula injection.
* **Privacy:** only the answers are kept in `localStorage` for resuming a draft, never the contact details.
* **Accessibility:** option cards use `radio`/`checkbox` roles with `aria-checked`, focus moves to each new step's
  heading, the live estimate is an `aria-live` region, form errors are linked with `aria-describedby`, keyboard focus
  rings are visible, and animations respect `prefers-reduced-motion`.
* **Responsive** from 375 px mobile to desktop, with a print stylesheet for the PDF export.

## 8. Testing and results

### Automated

`npm test` runs **15 unit tests** covering effort maths, scale and design effects, phase generation, stack
de-duplication, budget and timeline fit, the MVP-phasing suggestion (which must cost less than the full scope), lead
scoring tiers, email normalisation, enum rejection and honeypot pass-through. `npm run lint`, `tsc --noEmit` and
`npm run build` all pass.

### Manual end-to-end testing (in a browser)

* I completed the wizard for a SaaS / growth / 3-feature / ₹3–8L project. The result was **7–11 weeks,
  ₹7.6L–₹10.7L, "close to your budget"**, the lead scored **77 (hot)**, and it appeared in the dashboard.
* API checks: an unauthenticated `GET /api/leads` returns **401**; an invalid payload returns **422** with
  field-level issues; a wrong admin password returns **401**; a filled honeypot returns **201** and is **not stored**.
* Dashboard: the detail view expands, a status change persists, and the CSV export downloads.

**Bugs I found and fixed during testing** (see the git history):
1. Clicking *Continue* into the last step submitted the form, because React reused the same `<button>` element as
   its `type` changed to `submit`. Fixed by giving the two buttons distinct keys.
2. A saved draft was overwritten before it could be restored (in React Strict Mode). Fixed by gating the save effect
   on state instead of a ref.
3. A filled honeypot returned a revealing 422. It now returns a fake success.
4. Next.js 16 flagged the use of the current time during pre-rendering on the admin page. Fixed with `connection()`.

**Not yet verified:** the PostgreSQL adapter compiles and follows the documented `postgres.js` API, but it hasn't been
run against a live database (no Postgres was available on the development machine). All end-to-end testing used the
JSON-file adapter. After deploying with Neon, submit one lead and confirm it appears in `/admin`.

### Before vs after

| | Before (current `/contact`) | After (Blueprint) |
| --- | --- | --- |
| What the visitor gets immediately | "We'll reply in 24h" | A full blueprint: timeline, cost range, stack, phases, fit checks |
| Visitor effort | Write a free-text project description | Mostly one-click choices; only name and email are required |
| Structured data per lead | 4 short fields + free text | 11 fields (type, features, scale, timeline, design, budget + 5 contact) + the full blueprint and score |
| Lead prioritisation | Manual reading | Automatic 0–100 score with reasons |
| Team tooling | Inbox | Dashboard: filter, search, pipeline status, CSV |

### How to measure impact in production

No real traffic data was available, so I'm not claiming a conversion uplift. To measure it, I would run an **A/B
test**: the current form versus the Blueprint, with a 50/50 split on the "Start discovery" CTAs, tracking:
* **Primary:** inquiry completion rate (form submits ÷ form views)
* **Secondary:** % of leads that become qualified, time to first response, and step-by-step drop-off in the wizard

## 9. Limitations and next steps

* **Integrate into cynbit.in:** mount `<Wizard />` on `/contact` and point the "Start discovery" CTAs to it.
* **Notifications:** email the visitor their blueprint and alert sales about hot leads (Resend, WhatsApp, Slack).
* **Calendar booking:** let hot leads book a discovery call straight from the result screen (Cal.com).
* **Calibrate the estimator:** fit the effort and rate constants to Cynbit's past project data.
* **Analytics:** track per-step funnel events to find where visitors drop off.
* **Scale-out:** move rate limiting to Redis (Upstash) for multi-region deployments, and admin auth to Auth.js with
  per-user roles.
* **Quick wins I noticed:** delay the newsletter modal (show it on exit intent or after scrolling 50%), and render
  the hero text without waiting for the animation, to improve LCP.

## 10. Git history

The repository was built in small, focused commits: engine + tests → API + storage + auth → wizard UI → admin
dashboard → fixes from end-to-end testing → documentation.
