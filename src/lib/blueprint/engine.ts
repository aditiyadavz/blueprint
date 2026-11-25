import {
  BUDGETS,
  DESIGN_STATUS,
  FEATURES,
  PROJECT_TYPES,
  RATE_PER_PERSON_WEEK,
  SCALES,
  TIMELINES,
  type Budget,
  type DesignStatus,
  type Feature,
  type ProjectType,
  type Scale,
  type Timeline,
} from "./options";

export interface ProjectAnswers {
  projectType: ProjectType;
  features: Feature[];
  scale: Scale;
  timeline: Timeline;
  budget: Budget;
  design: DesignStatus;
}

export interface ContactInfo {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  notes?: string;
}

export interface Phase {
  name: string;
  weeks: number;
  summary: string;
}

export interface Blueprint {
  title: string;
  effortPersonWeeks: number;
  teamSize: number;
  weeks: { low: number; high: number };
  cost: { low: number; high: number };
  phases: Phase[];
  stack: string[];
  team: string[];
  budgetFit: "within" | "stretch" | "over" | "unknown";
  timelineFit: "fits" | "tight";
  recommendations: string[];
  risks: string[];
}

export interface LeadScore {
  score: number;
  tier: "hot" | "warm" | "cold";
  reasons: string[];
}

const OVERHEAD = 1.15; // project management + QA overhead on raw build effort
const round = (n: number, step: number) => Math.round(n / step) * step;

/** Total engineering effort in person-weeks for a set of answers. */
export function estimateEffort(a: Pick<ProjectAnswers, "projectType" | "features" | "scale" | "design">): number {
  const featureWeeks = a.features.reduce((sum, f) => sum + FEATURES[f].weeks, 0);
  const raw = PROJECT_TYPES[a.projectType].baseWeeks + featureWeeks + DESIGN_STATUS[a.design].weeks;
  return Math.round(raw * SCALES[a.scale].multiplier * OVERHEAD * 10) / 10;
}

function teamSizeFor(scale: Scale, timeline: Timeline): number {
  const base = { mvp: 2, growth: 3, enterprise: 4 }[scale];
  return Math.min(base + (timeline === "asap" ? 1 : 0), 5);
}

function teamRoles(size: number, a: ProjectAnswers): string[] {
  const roles = ["Tech lead / architect", "Full-stack engineer"];
  if (a.design === "need-design") roles.push("UI/UX designer (part-time)");
  if (a.projectType === "ai-automation" || a.features.includes("ai-features")) roles.push("AI/ML engineer");
  if (a.projectType === "mobile-app") roles.push("Mobile engineer");
  while (roles.length < size + (a.design === "need-design" ? 1 : 0)) roles.push("Full-stack engineer");
  roles.push("QA engineer (part-time)");
  return roles;
}

function buildPhases(totalWeeks: number, a: ProjectAnswers): Phase[] {
  const t = PROJECT_TYPES[a.projectType];
  const share: [string, number, string][] = [
    ["Discovery & audit", 0.08, "Workshops to map workflows, users, constraints and success metrics."],
    ["Strategy & blueprinting", 0.07, `Architecture, data model and integration plan for your ${t.label.toLowerCase()}.`],
  ];
  if (a.design === "need-design") {
    share.push(["High-fidelity design", 0.15, "Wireframes → clickable prototype → design system, validated with you."]);
  }
  const fixed = share.reduce((s, [, p]) => s + p, 0) + 0.12 + 0.05;
  share.push([
    "Technical implementation",
    1 - fixed,
    `Two-week sprints with demos. Core build${a.features.length ? ` plus ${a.features.length} feature module${a.features.length > 1 ? "s" : ""}` : ""}.`,
  ]);
  share.push(["Quality & integrity check", 0.12, "Automated tests, load testing and a security review before launch."]);
  share.push(["Deployment & evolution", 0.05, "Production launch, monitoring, handover and an optimisation roadmap."]);
  return share.map(([name, pct, summary]) => ({ name, summary, weeks: Math.max(0.5, round(totalWeeks * pct, 0.5)) }));
}

/** Turns wizard answers into a tailored, indicative project blueprint. */
export function generateBlueprint(a: ProjectAnswers): Blueprint {
  const type = PROJECT_TYPES[a.projectType];
  const effort = estimateEffort(a);
  const teamSize = teamSizeFor(a.scale, a.timeline);
  const calendar = Math.max(2, effort / teamSize);
  const weeks = { low: Math.max(2, Math.round(calendar * 0.85)), high: Math.ceil(calendar * 1.2) };
  const cost = {
    low: round(effort * RATE_PER_PERSON_WEEK * 0.85, 10_000),
    high: round(effort * RATE_PER_PERSON_WEEK * 1.2, 10_000),
  };

  const stack: string[] = [...type.stack];
  for (const f of a.features) {
    const s = FEATURES[f].stack;
    if (s && !stack.includes(s)) stack.push(s);
  }
  if (a.scale !== "mvp") stack.push("CI/CD + automated tests", "Observability (Sentry, uptime alerts)");

  const budget = BUDGETS[a.budget];
  let budgetFit: Blueprint["budgetFit"];
  if (a.budget === "unsure") budgetFit = "unknown";
  else if (cost.low <= budget.max && cost.high <= budget.max * 1.1) budgetFit = "within";
  else if (cost.low <= budget.max) budgetFit = "stretch";
  else budgetFit = "over";

  const timelineFit: Blueprint["timelineFit"] = weeks.high <= TIMELINES[a.timeline].maxWeeks ? "fits" : "tight";

  const recommendations: string[] = [];
  if (budgetFit === "over" || budgetFit === "stretch" || timelineFit === "tight") {
    const core = { ...a, features: a.features.slice(0, 2), design: a.design };
    const coreCost = round(estimateEffort(core) * RATE_PER_PERSON_WEEK, 10_000);
    recommendations.push(
      `Ship in phases: a focused Phase 1 with ${core.features.length ? core.features.map((f) => FEATURES[f].label.toLowerCase()).join(" and ") : "the core flows only"} (~${formatINR(coreCost)}), then add the rest once it's live.`,
    );
  }
  if (a.design === "have-designs") recommendations.push("Share your design files at kickoff — this cuts the timeline by about two weeks.");
  if (a.projectType === "website-seo" || a.features.includes("analytics"))
    recommendations.push("Set up analytics and Core Web Vitals monitoring from day one so you can measure ROI.");
  if (a.projectType === "ai-automation" || a.features.includes("ai-features"))
    recommendations.push("Start with a 1-week proof of concept on your real data to validate AI accuracy before the full build.");
  if (recommendations.length < 2) recommendations.push("Book a 30-minute discovery call to refine scope and lock a fixed-price quote.");

  const risks: string[] = [];
  if (a.features.includes("payments")) risks.push("Payments: use a PCI-compliant gateway (Razorpay/Stripe) so card data never touches your servers.");
  if (a.projectType === "ai-automation" || a.features.includes("ai-features"))
    risks.push("AI output quality: needs guardrails, evaluation sets and human review for critical actions.");
  if (a.features.includes("integrations")) risks.push("Third-party APIs: rate limits and sandbox access can block progress, so request credentials early.");
  if (a.features.includes("realtime")) risks.push("Real-time features add hosting cost; plan load tests before launch.");
  if (a.scale === "enterprise") risks.push("Enterprise scale: plan for a security audit, SSO and data-residency requirements.");
  if (timelineFit === "tight") risks.push(`Your timeline (${TIMELINES[a.timeline].blurb.toLowerCase()}) is tight for this scope.`);

  return {
    title: `${type.label} blueprint`,
    effortPersonWeeks: effort,
    teamSize,
    weeks,
    cost,
    phases: buildPhases(weeks.high, a),
    stack,
    team: teamRoles(teamSize, a),
    budgetFit,
    timelineFit,
    recommendations,
    risks,
  };
}

/** Scores a lead 0–100 so the sales team can prioritise follow-ups. */
export function scoreLead(a: ProjectAnswers, c: ContactInfo, bp: Blueprint): LeadScore {
  let score = 0;
  const reasons: string[] = [];
  const add = (pts: number, why: string) => {
    score += pts;
    reasons.push(`${pts > 0 ? "+" : ""}${pts} ${why}`);
  };

  if (bp.budgetFit === "within") add(30, "budget covers the estimate");
  else if (bp.budgetFit === "stretch") add(20, "budget close to the estimate");
  else if (bp.budgetFit === "unknown") add(12, "budget not decided yet");
  else add(5, "budget below the estimate");

  const budgetPts = { "8l-plus": 15, "3l-8l": 10, "1l-3l": 5, "under-1l": 0, unsure: 0 }[a.budget];
  if (budgetPts) add(budgetPts, `deal size (${BUDGETS[a.budget].label})`);

  add({ asap: 10, standard: 10, flexible: 5 }[a.timeline], `timeline: ${TIMELINES[a.timeline].label}`);
  add({ enterprise: 10, growth: 7, mvp: 4 }[a.scale], `scale: ${SCALES[a.scale].label}`);
  if (c.company?.trim()) add(10, "company provided");
  if (c.phone?.trim()) add(5, "phone number provided");
  if ((c.notes?.trim().length ?? 0) >= 40) add(10, "detailed project notes");
  if (a.features.length >= 3) add(5, "well-defined scope (3+ features)");
  if (/@(gmail|yahoo|hotmail|outlook)\./i.test(c.email) === false) add(5, "business email domain");

  score = Math.min(100, score);
  return { score, tier: score >= 65 ? "hot" : score >= 40 ? "warm" : "cold", reasons };
}

export function formatINR(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(n >= 1_000_000 ? 1 : 2).replace(/\.?0+$/, "")}L`;
  return `₹${Math.round(n / 1000)}K`;
}
