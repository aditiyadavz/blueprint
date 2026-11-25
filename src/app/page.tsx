import Link from "next/link";

const steps = [
  ["Pick what you're building", "Web app, mobile, AI automation, SaaS, e-commerce or SEO site."],
  ["Choose features & scale", "Tick the modules you need and how many users you expect."],
  ["Set timeline & budget", "Tell us your constraints, and we'll check that the plan fits them."],
  ["Get your blueprint instantly", "Phases, tech stack, team, timeline and a cost range. Download it as a PDF."],
];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-[#f6f9f9]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[1.1fr_1fr] md:py-28">
          <div className="animate-in">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Project intelligence</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-brand-900 md:text-6xl">
              Your project blueprint in under two minutes.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink/70">
              Answer six quick questions and get a tailored plan right away: delivery phases, recommended tech stack,
              team, timeline and an indicative budget range. No waiting for a call to know whether we&apos;re a fit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/blueprint"
                className="rounded-full bg-brand-700 px-7 py-3.5 font-semibold text-white shadow-lg shadow-brand-700/20 transition hover:bg-brand-800"
              >
                Build my blueprint →
              </Link>
              <a href="#why" className="rounded-full px-6 py-3.5 font-semibold text-brand-800 hover:bg-brand-100">
                Why this exists
              </a>
            </div>
          </div>

          <ol className="animate-in space-y-3 [animation-delay:120ms]">
            {steps.map(([title, body], i) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-brand-900">{title}</p>
                  <p className="text-sm text-ink/65">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="why" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-extrabold tracking-tight text-brand-900">What this replaces</h2>
        <p className="mt-3 max-w-3xl text-ink/70">
          Cynbit&apos;s contact page promises to &quot;analyze your requirements and prepare a tailored strategic
          overview&quot;, but today it&apos;s a free-text form. The visitor gets nothing back right away, and the team
          receives unstructured messages it has to sort through by hand.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-ink/10 bg-white p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-ink/50">Before</p>
            <ul className="mt-4 space-y-2 text-ink/75">
              <li>✕ Five fields: name, email, company, industry, message</li>
              <li>✕ Visitor waits ~24h with no idea of cost or timeline</li>
              <li>✕ Leads arrive as free text, with no budget, scope or urgency</li>
              <li>✕ Sales reads every message to decide which to answer first</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-700">After</p>
            <ul className="mt-4 space-y-2 text-brand-900">
              <li>✓ Guided 6-step wizard that is quicker to fill in than an open text box</li>
              <li>✓ Instant blueprint with phases, stack, team, timeline and budget range</li>
              <li>✓ Structured lead saved with project type, budget, timeline and features</li>
              <li>✓ Automatic 0–100 lead score, plus a dashboard with filters and CSV export</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
