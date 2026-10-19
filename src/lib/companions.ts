import { z } from "zod";
import type { EskulEvent, EskulKey } from "./types";

export const COMPANION_NAMES = [
  "Astiana Utami", "Icha Oktaviana", "Marwiyah Annafisah", "Nabilah Rahmah",
  "Syelvi Amelia Suryana", "Rahimatul Hikmah", "Intan Ayu Radeansyach", "Nusaibah Zata",
  "Annida Mar’athus Shaleha", "Cahya Camila Hamidah", "Alma Zakaria", "Shofiyyah",
] as const;

export function isDocumentationLink(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (url.hostname === "drive.google.com") return /\/(?:file\/d|folders)\/[a-zA-Z0-9_-]+(?:\/|$)/.test(url.pathname)
      || (/^\/(?:open|uc)$/.test(url.pathname) && /^[a-zA-Z0-9_-]+$/.test(url.searchParams.get("id") ?? ""));
    return url.hostname === "docs.google.com" && /^\/(?:document|spreadsheets|presentation|drawings|forms)\/(?:u\/\d+\/)?d\/[a-zA-Z0-9_-]+(?:\/|$)/.test(url.pathname);
  } catch { return false; }
}
export const companionNameSchema = z.string().trim().min(2).max(120)
  .refine(value => /\p{L}/u.test(value) && !/[\u0000-\u001f\u007f<>]/.test(value), "Masukkan nama pendamping yang valid.")
  .transform(value => value.replace(/\s+/g, " "));
export const companionContentSchema = z.object({
  name: companionNameSchema,
  notes: z.string().trim().max(2000),
  driveUrl: z.string().trim().max(2048).refine(isDocumentationLink, "Gunakan tautan file atau folder Google Drive yang valid."),
});
export const companionSubmissionSchema = companionContentSchema.extend({ id: z.uuid(), sessionId: z.string().min(1).max(1000) });
export const companionCorrectionSchema = companionContentSchema.extend({ id: z.uuid() });
export type CompanionSubmission = z.infer<typeof companionSubmissionSchema>;
export interface CompanionReceipt { id: string; name: string; eskul: string; date: string }
export interface CompanionReport {
  id: string;
  companion_name: string;
  submitted_by: string;
  schedule_id: string;
  source_spreadsheet: string;
  extracurricular_id: EskulKey;
  activity_date: string;
  activity_time: string;
  class_ids: string[];
  notes: string;
  drive_url: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}
export const reportableSessions = (events: EskulEvent[]) => events.filter(event => event.classes.length && !["libur", "ditiadakan"].includes(event.statusNormalized));
