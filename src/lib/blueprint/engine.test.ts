import { describe, expect, it } from "vitest";
import { estimateEffort, formatINR, generateBlueprint, scoreLead, type ProjectAnswers } from "./engine";
import { leadRequestSchema } from "./schema";

const base: ProjectAnswers = {
  projectType: "web-app",
  features: ["auth", "admin-dashboard"],
  scale: "mvp",
  timeline: "standard",
  budget: "3l-8l",
  design: "need-design",
};

describe("estimateEffort", () => {
  it("adds base, feature and design weeks with overhead", () => {
    // (6 + 1 + 2 + 2) * 1.0 * 1.15 ≈ 12.65 person-weeks, rounded to 1 decimal place
    const effort = estimateEffort(base);
    expect(effort).toBeGreaterThanOrEqual(12.6);
    expect(effort).toBeLessThanOrEqual(12.7);
  });

  it("scales effort with project scale", () => {
    expect(estimateEffort({ ...base, scale: "enterprise" })).toBeGreaterThan(estimateEffort({ ...base, scale: "growth" }));
    expect(estimateEffort({ ...base, scale: "growth" })).toBeGreaterThan(estimateEffort(base));
  });

  it("is cheaper when designs already exist", () => {
    expect(estimateEffort({ ...base, design: "have-designs" })).toBeLessThan(estimateEffort(base));
  });
});

describe("generateBlueprint", () => {
  const bp = generateBlueprint(base);

  it("returns ordered, positive ranges", () => {
    expect(bp.weeks.low).toBeLessThanOrEqual(bp.weeks.high);
    expect(bp.cost.low).toBeLessThan(bp.cost.high);
    expect(bp.cost.low).toBeGreaterThan(0);
  });

  it("follows Cynbit's lifecycle and includes design only when needed", () => {
    expect(bp.phases.map((p) => p.name)).toEqual([
      "Discovery & audit",
      "Strategy & blueprinting",
      "High-fidelity design",
      "Technical implementation",
      "Quality & integrity check",
      "Deployment & evolution",
    ]);
    const noDesign = generateBlueprint({ ...base, design: "have-designs" });
    expect(noDesign.phases.some((p) => p.name === "High-fidelity design")).toBe(false);
  });

  it("adds feature-specific stack items without duplicates", () => {
    const withPay = generateBlueprint({ ...base, features: ["payments", "payments" as never] });
    expect(withPay.stack.filter((s) => s.includes("Razorpay")).length).toBe(1);
  });

  it("flags budgets that cannot cover the scope and suggests phasing", () => {
    const big = generateBlueprint({ ...base, projectType: "saas", features: ["payments", "ai-features", "realtime"], scale: "enterprise", budget: "under-1l" });
    expect(big.budgetFit).toBe("over");
    expect(big.recommendations[0]).toMatch(/Ship in phases/);
  });

  it("flags tight timelines", () => {
    const rush = generateBlueprint({ ...base, projectType: "saas", features: ["payments", "integrations", "analytics"], timeline: "asap" });
    expect(rush.timelineFit).toBe("tight");
    expect(rush.risks.some((r) => r.includes("tight"))).toBe(true);
  });

  it("treats an undecided budget as unknown", () => {
    expect(generateBlueprint({ ...base, budget: "unsure" }).budgetFit).toBe("unknown");
  });
});

describe("scoreLead", () => {
  it("ranks a detailed, well-funded enterprise lead as hot", () => {
    const a: ProjectAnswers = { ...base, scale: "enterprise", budget: "8l-plus", features: ["auth", "payments", "analytics"] };
    const s = scoreLead(a, { name: "Riya", email: "riya@acme.io", company: "Acme", phone: "+91 98765 43210", notes: "We need a partner portal for 300 distributors with order tracking." }, generateBlueprint(a));
    expect(s.tier).toBe("hot");
    expect(s.score).toBeLessThanOrEqual(100);
  });

  it("ranks a minimal under-funded lead as cold", () => {
    const a: ProjectAnswers = { ...base, projectType: "saas", budget: "under-1l", timeline: "flexible", features: [] };
    const s = scoreLead(a, { name: "Sam", email: "sam@gmail.com" }, generateBlueprint(a));
    expect(s.tier).toBe("cold");
  });
});

describe("leadRequestSchema", () => {
  const contact = { name: "Aditi", email: "  Aditi@Example.COM ", company: "", phone: "", notes: "" };

  it("normalises email and accepts empty optionals", () => {
    const r = leadRequestSchema.parse({ answers: base, contact });
    expect(r.contact.email).toBe("aditi@example.com");
  });

  it("rejects unknown enum values and bad emails", () => {
    expect(leadRequestSchema.safeParse({ answers: { ...base, projectType: "rocket" }, contact }).success).toBe(false);
    expect(leadRequestSchema.safeParse({ answers: base, contact: { ...contact, email: "nope" } }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(leadRequestSchema.safeParse({ answers: base, contact, website: "spam.example" }).success).toBe(false);
  });
});

describe("formatINR", () => {
  it("formats lakhs and thousands", () => {
    expect(formatINR(450_000)).toBe("₹4.5L");
    expect(formatINR(1_250_000)).toBe("₹12.5L");
    expect(formatINR(80_000)).toBe("₹80K");
  });
});
