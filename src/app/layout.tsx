import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Project Blueprint | Cynbit improvement prototype",
  description:
    "Answer six quick questions and get an instant, tailored project blueprint: phases, tech stack, timeline and budget range.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="no-print sticky top-0 z-20 border-b border-brand-100 bg-white/85 backdrop-blur">
          <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-brand-800">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-sm text-white">
                B
              </span>
              Blueprint <span className="hidden font-medium text-brand-600/70 sm:inline">for Cynbit</span>
            </Link>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Link href="/admin" className="rounded-full px-4 py-2 text-brand-800 hover:bg-brand-50">
                Team dashboard
              </Link>
              <Link href="/blueprint" className="rounded-full bg-brand-700 px-4 py-2 text-white hover:bg-brand-800">
                Start blueprint
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="no-print border-t border-brand-100 bg-white py-6 text-center text-xs text-ink/60">
          Prototype built for the Cynbit Full Stack Developer Intern assessment. Not an official Cynbit page. Estimates
          are indicative.
        </footer>
      </body>
    </html>
  );
}
