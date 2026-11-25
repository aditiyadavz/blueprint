// Catalog of everything a visitor can choose in the wizard, plus the
// effort/cost assumptions the blueprint engine uses. Keeping the numbers
// in one data file means sales can tune them without touching logic.

export const PROJECT_TYPES = {
  "web-app": {
    label: "Custom web application",
    blurb: "Portals, dashboards, internal tools",
    icon: "🖥️",
    baseWeeks: 6,
    stack: ["Next.js + TypeScript", "Node.js API", "PostgreSQL", "Vercel / AWS"],
  },
  "mobile-app": {
    label: "Mobile app",
    blurb: "iOS + Android from one codebase",
    icon: "📱",
    baseWeeks: 8,
    stack: ["React Native (Expo)", "Node.js API", "PostgreSQL", "Firebase Cloud Messaging"],
  },
  "ai-automation": {
    label: "AI automation / agents",
    blurb: "LLM agents, workflow automation, chatbots",
    icon: "🤖",
    baseWeeks: 5,
    stack: ["Python (FastAPI)", "LLM APIs + RAG", "Vector DB (pgvector)", "Queue workers"],
  },
  saas: {
    label: "SaaS product",
    blurb: "Multi-tenant product with subscriptions",
    icon: "☁️",
    baseWeeks: 10,
    stack: ["Next.js + TypeScript", "NestJS API", "PostgreSQL (multi-tenant)", "Stripe / Razorpay", "AWS"],
  },
  ecommerce: {
    label: "E-commerce store",
    blurb: "Catalog, cart, checkout, orders",
    icon: "🛒",
    baseWeeks: 6,
    stack: ["Next.js storefront", "Headless commerce (Medusa / Shopify)", "Razorpay", "CDN image pipeline"],
  },
  "website-seo": {
    label: "Website + technical SEO",
    blurb: "Fast marketing site that ranks",
    icon: "📈",
    baseWeeks: 3,
    stack: ["Next.js (static + ISR)", "Headless CMS", "Schema.org markup", "Core Web Vitals monitoring"],
  },
} as const;

export const FEATURES = {
  auth: { label: "User accounts & login", weeks: 1, stack: "Auth.js / Clerk" },
  payments: { label: "Payments & invoicing", weeks: 1.5, stack: "Razorpay / Stripe" },
  "admin-dashboard": { label: "Admin dashboard", weeks: 2, stack: null },
  "ai-features": { label: "AI features (chat, summaries, search)", weeks: 2.5, stack: "LLM API + RAG" },
  analytics: { label: "Analytics & reports", weeks: 1.5, stack: "PostHog / Metabase" },
  integrations: { label: "Third-party integrations (CRM, ERP, WhatsApp)", weeks: 2, stack: "Webhooks + job queue" },
  realtime: { label: "Real-time updates / chat", weeks: 2, stack: "WebSockets (Socket.IO)" },
  "file-uploads": { label: "File uploads & media", weeks: 1, stack: "S3-compatible storage" },
  notifications: { label: "Email / SMS / push notifications", weeks: 1, stack: "Resend + MSG91" },
  "multi-language": { label: "Multi-language support", weeks: 1, stack: "next-intl" },
} as const;

export const SCALES = {
  mvp: { label: "MVP / pilot", blurb: "Up to ~1,000 users", multiplier: 1 },
  growth: { label: "Growing business", blurb: "1,000 – 50,000 users", multiplier: 1.3 },
  enterprise: { label: "Enterprise scale", blurb: "50,000+ users, compliance needs", multiplier: 1.7 },
} as const;

export const TIMELINES = {
  asap: { label: "ASAP", blurb: "Under 1 month", maxWeeks: 4 },
  standard: { label: "1 – 3 months", blurb: "Typical delivery", maxWeeks: 13 },
  flexible: { label: "3+ months", blurb: "Quality over speed", maxWeeks: 52 },
} as const;

// Budgets in INR. `max` is used to check budget fit against the estimate.
export const BUDGETS = {
  "under-1l": { label: "Under ₹1 lakh", min: 0, max: 100_000 },
  "1l-3l": { label: "₹1 – 3 lakh", min: 100_000, max: 300_000 },
  "3l-8l": { label: "₹3 – 8 lakh", min: 300_000, max: 800_000 },
  "8l-plus": { label: "₹8 lakh +", min: 800_000, max: Number.POSITIVE_INFINITY },
  unsure: { label: "Not sure yet", min: 0, max: Number.POSITIVE_INFINITY },
} as const;

export const DESIGN_STATUS = {
  "have-designs": { label: "I already have designs", weeks: 0 },
  "need-design": { label: "I need UI/UX design", weeks: 2 },
} as const;

/** Blended engineering cost per person-week (INR). Indicative only. */
export const RATE_PER_PERSON_WEEK = 35_000;

export type ProjectType = keyof typeof PROJECT_TYPES;
export type Feature = keyof typeof FEATURES;
export type Scale = keyof typeof SCALES;
export type Timeline = keyof typeof TIMELINES;
export type Budget = keyof typeof BUDGETS;
export type DesignStatus = keyof typeof DESIGN_STATUS;

export const keys = <T extends object>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
