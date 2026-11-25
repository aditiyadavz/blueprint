import { z } from "zod";
import { BUDGETS, DESIGN_STATUS, FEATURES, PROJECT_TYPES, SCALES, TIMELINES, keys } from "./options";

// Single source of truth for validation — used by the wizard (client)
// and the /api/leads route (server).

export const answersSchema = z.object({
  projectType: z.enum(keys(PROJECT_TYPES)),
  features: z.array(z.enum(keys(FEATURES))).max(Object.keys(FEATURES).length),
  scale: z.enum(keys(SCALES)),
  timeline: z.enum(keys(TIMELINES)),
  budget: z.enum(keys(BUDGETS)),
  design: z.enum(keys(DESIGN_STATUS)),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().max(120).pipe(z.email("Please enter a valid email")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,18}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const leadRequestSchema = z.object({
  answers: answersSchema,
  contact: contactSchema,
  // Honeypot: real users never see this field, bots fill it in.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type LeadRequest = z.infer<typeof leadRequestSchema>;
