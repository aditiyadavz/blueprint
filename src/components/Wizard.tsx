"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BlueprintView } from "./BlueprintView";
import { formatINR, generateBlueprint, type Blueprint, type ProjectAnswers } from "@/lib/blueprint/engine";
import { BUDGETS, DESIGN_STATUS, FEATURES, PROJECT_TYPES, SCALES, TIMELINES, type Feature } from "@/lib/blueprint/options";
import { contactSchema } from "@/lib/blueprint/schema";

type Draft = Partial<Omit<ProjectAnswers, "features">> & { features: Feature[] };
type Contact = { name: string; email: string; company: string; phone: string; notes: string };

const STEPS = ["Project", "Features", "Scale", "Timeline", "Budget", "Contact"] as const;
const DRAFT_KEY = "blueprint-draft-v1";
const emptyContact: Contact = { name: "", email: "", company: "", phone: "", notes: "" };

function OptionCard({
  selected,
  onClick,
  title,
  blurb,
  icon,
  multi,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  blurb?: string;
  icon?: string;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
        selected ? "border-brand-600 bg-brand-50 shadow-sm" : "border-ink/10 bg-white hover:border-brand-200"
      }`}
    >
      {icon && (
        <span aria-hidden className="text-2xl leading-none">
          {icon}
        </span>
      )}
      <span className="flex-1">
        <span className="block font-semibold text-brand-900">{title}</span>
        {blurb && <span className="mt-0.5 block text-sm text-ink/60">{blurb}</span>}
      </span>
      <span
        aria-hidden
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-2 text-[10px] text-white ${multi ? "rounded-md" : "rounded-full"} ${
          selected ? "border-brand-600 bg-brand-600" : "border-ink/20"
        }`}
      >
        {selected && "✓"}
      </span>
    </button>
  );
}

export function Wizard() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({ features: [] });
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<{ blueprint: Blueprint; name: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // `hydrated` is state (not a ref) so the save effect only runs after the
  // restored draft has actually rendered; otherwise the first save would
  // overwrite the stored draft with the empty initial state.
  const [hydrated, setHydrated] = useState(false);

  // Resume an unfinished blueprint (answers only, never contact details).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const { draft: d, step: s } = JSON.parse(saved);
        setDraft(d); // eslint-disable-line react-hooks/set-state-in-effect
        setStep(Math.min(s, STEPS.length - 1));
      }
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated && !result) localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step }));
  }, [hydrated, draft, step, result]);

  useEffect(() => headingRef.current?.focus(), [step, result]);

  const complete = (d: Draft): d is ProjectAnswers =>
    !!(d.projectType && d.scale && d.timeline && d.budget && d.design);

  // Live preview: the same engine the server uses, run in the browser.
  const preview = useMemo(() => {
    if (!draft.projectType) return null;
    return generateBlueprint({
      projectType: draft.projectType,
      features: draft.features,
      scale: draft.scale ?? "mvp",
      timeline: draft.timeline ?? "standard",
      budget: draft.budget ?? "unsure",
      design: draft.design ?? "need-design",
    });
  }, [draft]);

  const canContinue = [
    !!draft.projectType,
    true,
    !!draft.scale,
    !!draft.timeline && !!draft.design,
    !!draft.budget,
    true,
  ][step];

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleFeature = (f: Feature) =>
    setDraft((d) => ({ ...d, features: d.features.includes(f) ? d.features.filter((x) => x !== f) : [...d.features, f] }));

  async function submit() {
    const parsed = contactSchema.safeParse(contact);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    if (!complete(draft)) return;
    setStatus("submitting");
    setServerError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: draft, contact, website: honeypot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      localStorage.removeItem(DRAFT_KEY);
      setResult({ blueprint: data.blueprint, name: parsed.data.name });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setStatus("error");
      setServerError(e instanceof Error ? e.message : "Something went wrong");
      return;
    }
    setStatus("idle");
  }

  if (result) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-12">
        <div className="no-print mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">✓ Blueprint saved. Our team has your request.</p>
            <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-3xl font-extrabold tracking-tight text-brand-900 outline-none">
              Here&apos;s your project blueprint
            </h1>
            <p className="mt-1 text-ink/65">An architect will follow up within 24 hours to refine it into a fixed quote.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Download PDF
            </button>
            <button
              onClick={() => {
                setResult(null);
                setStep(0);
                setDraft({ features: [] });
                setContact(emptyContact);
              }}
              className="rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50"
            >
              Start over
            </button>
          </div>
        </div>
        <BlueprintView bp={result.blueprint} name={result.name} />
      </div>
    );
  }

  const field = (k: keyof Contact, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="text-sm font-semibold text-brand-900">{label}</span>
      <input
        {...props}
        value={contact[k]}
        onChange={(e) => setContact((c) => ({ ...c, [k]: e.target.value }))}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `${k}-err` : undefined}
        className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 ${errors[k] ? "border-rose-400" : "border-ink/15"}`}
      />
      {errors[k] && (
        <span id={`${k}-err`} className="mt-1 block text-sm text-rose-600">
          {errors[k]}
        </span>
      )}
    </label>
  );

  const titles = [
    ["What are you building?", "Pick the closest match. You can add details later."],
    ["Which features do you need?", "Select all that apply. Skip this step if you're not sure yet."],
    ["How big will it get?", "Expected users in the first year."],
    ["When do you need it, and do you have designs?", "This shapes the team size and the delivery plan."],
    ["What's your budget range?", "Rough is fine. We use it to check whether the plan fits, and to suggest phasing if it doesn't."],
    ["Where should we send your blueprint?", "You'll see it right away. We'll also follow up within 24 hours."],
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1fr_340px]">
      <div>
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-semibold text-ink/50">
            <span>
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </span>
            <span>{Math.round((step / STEPS.length) * 100)}%</span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
          >
            <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold tracking-tight text-brand-900 outline-none md:text-3xl">
          {titles[step][0]}
        </h1>
        <p className="mt-1 text-ink/65">{titles[step][1]}</p>

        <div key={step} className="animate-in mt-7">
          {step === 0 && (
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
              {Object.entries(PROJECT_TYPES).map(([k, v]) => (
                <OptionCard key={k} selected={draft.projectType === k} onClick={() => set("projectType", k as ProjectAnswers["projectType"])} title={v.label} blurb={v.blurb} icon={v.icon} />
              ))}
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(FEATURES).map(([k, v]) => (
                <OptionCard key={k} multi selected={draft.features.includes(k as Feature)} onClick={() => toggleFeature(k as Feature)} title={v.label} />
              ))}
            </div>
          )}
          {step === 2 && (
            <div role="radiogroup" className="grid gap-3">
              {Object.entries(SCALES).map(([k, v]) => (
                <OptionCard key={k} selected={draft.scale === k} onClick={() => set("scale", k as ProjectAnswers["scale"])} title={v.label} blurb={v.blurb} />
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-8">
              <div role="radiogroup" aria-label="Timeline" className="grid gap-3 sm:grid-cols-3">
                {Object.entries(TIMELINES).map(([k, v]) => (
                  <OptionCard key={k} selected={draft.timeline === k} onClick={() => set("timeline", k as ProjectAnswers["timeline"])} title={v.label} blurb={v.blurb} />
                ))}
              </div>
              <div role="radiogroup" aria-label="Design" className="grid gap-3 sm:grid-cols-2">
                {Object.entries(DESIGN_STATUS).map(([k, v]) => (
                  <OptionCard key={k} selected={draft.design === k} onClick={() => set("design", k as ProjectAnswers["design"])} title={v.label} />
                ))}
              </div>
            </div>
          )}
          {step === 4 && (
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
              {Object.entries(BUDGETS).map(([k, v]) => (
                <OptionCard key={k} selected={draft.budget === k} onClick={() => set("budget", k as ProjectAnswers["budget"])} title={v.label} />
              ))}
            </div>
          )}
          {step === 5 && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              id="contact-form"
              className="grid gap-4 sm:grid-cols-2"
            >
              {field("name", "Full name *", { autoComplete: "name", placeholder: "e.g. Riya Sharma" })}
              {field("email", "Work email *", { type: "email", autoComplete: "email", placeholder: "riya@company.com" })}
              {field("company", "Company", { autoComplete: "organization" })}
              {field("phone", "Phone", { type: "tel", autoComplete: "tel", placeholder: "+91 98765 43210" })}
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-brand-900">Anything else we should know?</span>
                <textarea
                  rows={4}
                  value={contact.notes}
                  onChange={(e) => setContact((c) => ({ ...c, notes: e.target.value }))}
                  placeholder="Goals, existing systems, links to references…"
                  className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </label>
              {/* Honeypot: hidden from humans and screen readers */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />
              {serverError && (
                <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">
                  {serverError}
                </p>
              )}
            </form>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="rounded-full px-5 py-3 font-semibold text-brand-800 hover:bg-brand-50 disabled:invisible"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              key="next"
              type="button"
              disabled={!canContinue}
              onClick={() => setStep((s) => s + 1)}
              className="rounded-full bg-brand-700 px-7 py-3 font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step === 1 && draft.features.length === 0 ? "Skip" : "Continue"} →
            </button>
          ) : (
            <button
              key="submit"
              type="submit"
              form="contact-form"
              disabled={status === "submitting"}
              className="rounded-full bg-brand-700 px-7 py-3 font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
            >
              {status === "submitting" ? "Generating…" : "Get my blueprint"}
            </button>
          )}
        </div>
      </div>

      {/* Live estimate sidebar */}
      <aside className="lg:sticky lg:top-24 lg:self-start" aria-live="polite">
        <div className="rounded-3xl bg-brand-800 p-6 text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-200">Live estimate</p>
          {preview ? (
            <>
              <p className="mt-3 font-semibold">{PROJECT_TYPES[draft.projectType!].label}</p>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-xs text-brand-200">Timeline</dt>
                  <dd className="text-xl font-bold">
                    {preview.weeks.low}–{preview.weeks.high} weeks
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-brand-200">Investment</dt>
                  <dd className="text-xl font-bold">
                    {formatINR(preview.cost.low)} – {formatINR(preview.cost.high)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-brand-200">Features</dt>
                  <dd className="text-sm">{draft.features.length ? draft.features.map((f) => FEATURES[f].label).join(", ") : "Core only"}</dd>
                </div>
              </dl>
              <p className="mt-5 border-t border-white/15 pt-4 text-xs text-brand-200">
                Updates as you answer. Your full blueprint includes phases, stack, team and recommendations.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-brand-100">Pick a project type to see a live timeline and budget range.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
