import { NextResponse, type NextRequest } from "next/server";
import { generateBlueprint, scoreLead } from "@/lib/blueprint/engine";
import { leadRequestSchema } from "@/lib/blueprint/schema";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

// POST /api/leads — validate, generate blueprint server-side (never trust
// client-computed numbers), score, persist, return the blueprint.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`lead:${ip}`)) {
    return NextResponse.json({ error: "Too many submissions. Please try again in a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = leadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 },
    );
  }

  const { answers, contact, website } = parsed.data;
  const blueprint = generateBlueprint(answers);

  // Honeypot tripped: pretend success so bots learn nothing, but don't store.
  if (website) return NextResponse.json({ id: null, blueprint }, { status: 201 });

  const cleanContact = {
    name: contact.name,
    email: contact.email,
    company: contact.company || undefined,
    phone: contact.phone || undefined,
    notes: contact.notes || undefined,
  };
  const score = scoreLead(answers, cleanContact, blueprint);

  try {
    const lead = await getStore().create({ answers, contact: cleanContact, blueprint, score });
    return NextResponse.json({ id: lead.id, blueprint }, { status: 201 });
  } catch (err) {
    console.error("Failed to store lead", err);
    return NextResponse.json({ error: "Could not save your request. Please try again." }, { status: 500 });
  }
}

// GET /api/leads — admin-only JSON export (also used for CSV download).
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const leads = await getStore().list();

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["created_at", "name", "email", "company", "phone", "project_type", "budget", "timeline", "score", "tier", "status", "est_cost_low", "est_cost_high"];
    const rows = leads.map((l) =>
      [l.createdAt, l.contact.name, l.contact.email, l.contact.company, l.contact.phone, l.answers.projectType, l.answers.budget, l.answers.timeline, l.score.score, l.score.tier, l.status, l.blueprint.cost.low, l.blueprint.cost.high]
        .map(esc)
        .join(","),
    );
    return new NextResponse([header.join(","), ...rows].join("\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="leads.csv"' },
    });
  }
  return NextResponse.json({ leads });
}
