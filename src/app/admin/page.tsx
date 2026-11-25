import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { isAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Leads dashboard | Blueprint", robots: { index: false } };

async function AdminContent() {
  await connection(); // per-request: session expiry check uses the current time
  if (!(await isAdmin())) return <LoginForm />;
  const leads = await getStore().list();
  return <AdminDashboard initialLeads={leads} />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center text-ink/60">Loading dashboard…</p>}>
      <AdminContent />
    </Suspense>
  );
}
