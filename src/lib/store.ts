import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import type { Blueprint, ContactInfo, LeadScore, ProjectAnswers } from "./blueprint/engine";

export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";
export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "won", "lost"];

export interface Lead {
  id: string;
  createdAt: string;
  status: LeadStatus;
  answers: ProjectAnswers;
  contact: ContactInfo;
  blueprint: Blueprint;
  score: LeadScore;
}

export interface LeadStore {
  create(lead: Omit<Lead, "id" | "createdAt" | "status">): Promise<Lead>;
  list(): Promise<Lead[]>;
  get(id: string): Promise<Lead | null>;
  updateStatus(id: string, status: LeadStatus): Promise<boolean>;
}

// ---------- PostgreSQL (production: Neon / Supabase / Vercel Postgres) ----------

function postgresStore(url: string): LeadStore {
  const sql = postgres(url, { ssl: url.includes("localhost") ? false : "require", max: 3 });
  let ready: Promise<unknown> | null = null;
  const init = () =>
    (ready ??= sql`
      CREATE TABLE IF NOT EXISTS leads (
        id          uuid PRIMARY KEY,
        created_at  timestamptz NOT NULL DEFAULT now(),
        status      text NOT NULL DEFAULT 'new',
        score       integer NOT NULL,
        tier        text NOT NULL,
        email       text NOT NULL,
        data        jsonb NOT NULL
      )`.then(() => sql`CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC)`));

  type Row = { id: string; created_at: Date; status: LeadStatus; data: Omit<Lead, "id" | "createdAt" | "status"> };
  const toLead = (r: Row): Lead => ({ id: r.id, createdAt: r.created_at.toISOString(), status: r.status, ...r.data });

  return {
    async create(input) {
      await init();
      const id = randomUUID();
      const [row] = await sql<Row[]>`
        INSERT INTO leads (id, score, tier, email, data)
        VALUES (${id}, ${input.score.score}, ${input.score.tier}, ${input.contact.email}, ${sql.json(JSON.parse(JSON.stringify(input)))})
        RETURNING id, created_at, status, data`;
      return toLead(row);
    },
    async list() {
      await init();
      const rows = await sql<Row[]>`SELECT id, created_at, status, data FROM leads ORDER BY created_at DESC LIMIT 500`;
      return rows.map(toLead);
    },
    async get(id) {
      await init();
      const rows = await sql<Row[]>`SELECT id, created_at, status, data FROM leads WHERE id = ${id}`;
      return rows[0] ? toLead(rows[0]) : null;
    },
    async updateStatus(id, status) {
      await init();
      const res = await sql`UPDATE leads SET status = ${status} WHERE id = ${id}`;
      return res.count > 0;
    },
  };
}

// ---------- JSON file (zero-config local development) ----------

function fileStore(): LeadStore {
  const file = path.join(process.cwd(), ".data", "leads.json");
  let queue: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<Lead[]> => {
    try {
      return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      return [];
    }
  };
  const write = async (leads: Lead[]) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(leads, null, 2));
  };
  // Serialise writes so concurrent submissions don't clobber each other.
  const locked = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn);
    queue = run.catch(() => undefined);
    return run;
  };

  return {
    create: (input) =>
      locked(async () => {
        const lead: Lead = { id: randomUUID(), createdAt: new Date().toISOString(), status: "new", ...input };
        await write([lead, ...(await read())]);
        return lead;
      }),
    list: async () => read(),
    get: async (id) => (await read()).find((l) => l.id === id) ?? null,
    updateStatus: (id, status) =>
      locked(async () => {
        const leads = await read();
        const lead = leads.find((l) => l.id === id);
        if (!lead) return false;
        lead.status = status;
        await write(leads);
        return true;
      }),
  };
}

const globalStore = globalThis as unknown as { __leadStore?: LeadStore };

export function getStore(): LeadStore {
  if (!globalStore.__leadStore) {
    const url = process.env.DATABASE_URL;
    globalStore.__leadStore = url ? postgresStore(url) : fileStore();
  }
  return globalStore.__leadStore;
}
