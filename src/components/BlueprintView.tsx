import { formatINR, type Blueprint } from "@/lib/blueprint/engine";

const fitStyles = {
  within: ["Within your budget", "bg-emerald-50 text-emerald-800 border-emerald-200"],
  stretch: ["Close to your budget", "bg-amber-50 text-amber-800 border-amber-200"],
  over: ["Above your budget, so we suggest phasing", "bg-rose-50 text-rose-800 border-rose-200"],
  unknown: ["Budget to be discussed", "bg-slate-50 text-slate-700 border-slate-200"],
} as const;

export function BlueprintView({ bp, name }: { bp: Blueprint; name?: string }) {
  const [fitLabel, fitClass] = fitStyles[bp.budgetFit];
  const totalWeeks = bp.phases.reduce((s, p) => s + p.weeks, 0);

  return (
    <div className="space-y-6">
      <div className="print-card rounded-3xl bg-brand-800 p-7 text-white shadow-xl md:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-200">
          {name ? `Prepared for ${name}` : "Your blueprint"}
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight">{bp.title}</h2>
        <dl className="mt-7 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-brand-200">Estimated timeline</dt>
            <dd className="text-2xl font-bold">
              {bp.weeks.low}–{bp.weeks.high} weeks
            </dd>
          </div>
          <div>
            <dt className="text-sm text-brand-200">Indicative investment</dt>
            <dd className="text-2xl font-bold">
              {formatINR(bp.cost.low)} – {formatINR(bp.cost.high)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-brand-200">Core team</dt>
            <dd className="text-2xl font-bold">{bp.teamSize} engineers</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <span className={`rounded-full border px-3 py-1 font-semibold ${fitClass}`}>{fitLabel}</span>
          <span
            className={`rounded-full border px-3 py-1 font-semibold ${bp.timelineFit === "fits" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
          >
            {bp.timelineFit === "fits" ? "Fits your timeline" : "Timeline is tight"}
          </span>
        </div>
      </div>

      <section className="print-card rounded-3xl border border-brand-100 bg-white p-7 shadow-sm">
        <h3 className="text-lg font-bold text-brand-900">Delivery roadmap</h3>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-brand-50" aria-hidden>
          {bp.phases.map((p, i) => (
            <div
              key={p.name}
              style={{ width: `${(p.weeks / totalWeeks) * 100}%`, opacity: 0.45 + (i / bp.phases.length) * 0.55 }}
              className="border-r-2 border-white bg-brand-600 last:border-0"
            />
          ))}
        </div>
        <ol className="mt-5 space-y-4">
          {bp.phases.map((p, i) => (
            <li key={p.name} className="flex gap-4">
              <span className="mt-0.5 font-mono text-sm font-bold text-brand-500">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-brand-900">{p.name}</p>
                  <p className="text-sm font-medium text-ink/60">~{p.weeks} wk</p>
                </div>
                <p className="text-sm text-ink/70">{p.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="print-card rounded-3xl border border-brand-100 bg-white p-7 shadow-sm">
          <h3 className="text-lg font-bold text-brand-900">Recommended stack</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {bp.stack.map((s) => (
              <li key={s} className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800">
                {s}
              </li>
            ))}
          </ul>
          <h3 className="mt-7 text-lg font-bold text-brand-900">Team</h3>
          <ul className="mt-3 space-y-1 text-sm text-ink/75">
            {bp.team.map((t, i) => (
              <li key={`${t}-${i}`}>• {t}</li>
            ))}
          </ul>
        </section>
        <section className="print-card rounded-3xl border border-brand-100 bg-white p-7 shadow-sm">
          <h3 className="text-lg font-bold text-brand-900">Our recommendations</h3>
          <ul className="mt-4 space-y-3 text-sm text-ink/80">
            {bp.recommendations.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-brand-600">→</span>
                {r}
              </li>
            ))}
          </ul>
          {bp.risks.length > 0 && (
            <>
              <h3 className="mt-7 text-lg font-bold text-brand-900">Things to plan for</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink/75">
                {bp.risks.map((r) => (
                  <li key={r}>⚠ {r}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
      <p className="text-xs text-ink/50">
        Indicative estimate based on {bp.effortPersonWeeks} person-weeks of effort. A fixed quote follows the discovery
        call.
      </p>
    </div>
  );
}
