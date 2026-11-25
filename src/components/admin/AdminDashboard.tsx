"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { BlueprintView } from "@/components/BlueprintView";
import { formatINR } from "@/lib/blueprint/engine";
import { BUDGETS, FEATURES, PROJECT_TYPES, SCALES, TIMELINES } from "@/lib/blueprint/options";
import type { Lead, LeadStatus } from "@/lib/store";

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "won", "lost"];
const tierClass = {
  hot: "bg-rose-100 text-rose-800",
  warm: "bg-amber-100 text-amber-800",
  cold: "bg-slate-100 text-slate-700",
} as const;

export function AdminDashboard({ initialLeads }: { initialLeads: Lead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [tier, setTier] = useState<"all" | Lead["score"]["tier"]>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "score">("newest");
  const [open, setOpen] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter((l) => tier === "all" || l.score.tier === tier)
      .filter((l) => !q || [l.contact.name, l.contact.email, l.contact.company].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => (sort === "score" ? b.score.score - a.score.score : b.createdAt.localeCompare(a.createdAt)));
  }, [leads, tier, query, sort]);

  const stats = useMemo(() => {
    const open = leads.filter((l) => l.status !== "lost");
    return {
      total: leads.length,
      hot: leads.filter((l) => l.score.tier === "hot").length,
      avg: leads.length ? Math.round(leads.reduce((s, l) => s + l.score.score, 0) / leads.length) : 0,
      pipeline: open.reduce((s, l) => s + (l.blueprint.cost.low + l.blueprint.cost.high) / 2, 0),
    };
  }, [leads]);

  async function updateStatus(id: string, status: LeadStatus) {
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) setLeads(prev); // roll back the optimistic update
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-900">Blueprint leads</h1>
          <p className="text-ink/60">Every lead arrives scored and structured, so the hottest ones are at the top.</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/leads?format=csv" download className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50">
            Export CSV
          </a>
          <button onClick={logout} className="rounded-full px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-ink/5">
            Sign out
          </button>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Total leads", stats.total],
          ["Hot leads", stats.hot],
          ["Average score", stats.avg],
          ["Open pipeline (est.)", formatINR(stats.pipeline)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-brand-100 bg-white p-5">
            <dt className="text-sm text-ink/60">{label}</dt>
            <dd className="mt-1 text-2xl font-extrabold text-brand-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search name, email, company…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search leads"
          className="min-w-60 flex-1 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500"
        />
        <div className="flex rounded-full border border-ink/10 bg-white p-1 text-sm" role="group" aria-label="Filter by tier">
          {(["all", "hot", "warm", "cold"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              aria-pressed={tier === t}
              className={`rounded-full px-3 py-1 font-semibold capitalize ${tier === t ? "bg-brand-700 text-white" : "text-ink/60"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          aria-label="Sort leads"
          className="rounded-full border border-ink/15 bg-white px-3 py-2 text-sm"
        >
          <option value="newest">Newest first</option>
          <option value="score">Highest score</option>
        </select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-brand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-100 bg-brand-50/60 text-xs uppercase tracking-wider text-ink/55">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Budget / timeline</th>
              <th className="px-4 py-3">Estimate</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink/50">
                  No leads yet. Submit one through the <Link className="font-semibold text-brand-700 underline" href="/blueprint">blueprint wizard</Link>.
                </td>
              </tr>
            )}
            {visible.map((l) => (
              <Fragment key={l.id}>
                <tr className="border-b border-ink/5 align-top hover:bg-brand-50/40">
                  <td className="px-4 py-3">
                    <button onClick={() => setOpen(open === l.id ? null : l.id)} className="text-left" aria-expanded={open === l.id}>
                      <span className="font-semibold text-brand-900 underline-offset-2 hover:underline">{l.contact.name}</span>
                      <span className="block text-xs text-ink/55">{l.contact.company || l.contact.email}</span>
                      <span className="block text-xs text-ink/40">{new Date(l.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {PROJECT_TYPES[l.answers.projectType].label}
                    <span className="block text-xs text-ink/55">
                      {SCALES[l.answers.scale].label} · {l.answers.features.length} features
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {BUDGETS[l.answers.budget].label}
                    <span className="block text-xs text-ink/55">{TIMELINES[l.answers.timeline].label}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatINR(l.blueprint.cost.low)}–{formatINR(l.blueprint.cost.high)}
                    <span className="block text-xs text-ink/55">
                      {l.blueprint.weeks.low}–{l.blueprint.weeks.high} wk
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tierClass[l.score.tier]}`} title={l.score.reasons.join("\n")}>
                      {l.score.score} · {l.score.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => updateStatus(l.id, e.target.value as LeadStatus)}
                      aria-label={`Status for ${l.contact.name}`}
                      className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-sm capitalize"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
                {open === l.id && (
                  <tr className="border-b border-ink/5 bg-[#f6f9f9]">
                    <td colSpan={6} className="px-4 py-6">
                      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                        <div className="space-y-4 text-sm">
                          <div>
                            <p className="font-bold text-brand-900">Contact</p>
                            <p>{l.contact.email}</p>
                            {l.contact.phone && <p>{l.contact.phone}</p>}
                          </div>
                          {l.contact.notes && (
                            <div>
                              <p className="font-bold text-brand-900">Notes</p>
                              <p className="whitespace-pre-wrap text-ink/75">{l.contact.notes}</p>
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-brand-900">Features</p>
                            <p className="text-ink/75">{l.answers.features.map((f) => FEATURES[f].label).join(", ") || "None selected"}</p>
                          </div>
                          <div>
                            <p className="font-bold text-brand-900">Why this score</p>
                            <ul className="text-ink/75">
                              {l.score.reasons.map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <BlueprintView bp={l.blueprint} name={l.contact.name} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
