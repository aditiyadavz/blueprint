"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError((await res.json().catch(() => ({}))).error || "Login failed");
  }

  return (
    <div className="mx-auto max-w-sm px-5 py-24">
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">Team dashboard</h1>
      <p className="mt-1 text-sm text-ink/60">Sign in to review incoming blueprint leads.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block">
          <span className="text-sm font-semibold text-brand-900">Admin password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-rose-600">
            {error}
          </p>
        )}
        <button disabled={busy} className="w-full rounded-full bg-brand-700 py-3 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
