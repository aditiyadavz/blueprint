import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { LEAD_STATUSES, getStore } from "@/lib/store";

const patchSchema = z.object({ status: z.enum(LEAD_STATUSES as [string, ...string[]]) });

// PATCH /api/leads/:id — admin updates the pipeline status of a lead.
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 422 });
  const ok = await getStore().updateStatus(id, parsed.data.status as (typeof LEAD_STATUSES)[number]);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
