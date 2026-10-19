import { ESKUL_META, ESKUL_ORDER } from "./constants";
import type { EskulEvent, EskulKey } from "./types";

export interface SessionRecap {
  from: string;
  to: string;
  eskul: EskulKey | "all";
  fetchedAt: string;
  events: EskulEvent[];
  total: number;
  days: number;
  activeEskuls: number;
  rows: { eskul: EskulKey; label: string; count: number; days: number; lastDate: string | null }[];
}
export const RECAP_COUNT_NOTE = "Satu jadwal dihitung sebagai satu sesi, meskipun melibatkan beberapa kelas. Sesi pada jam yang berbeda dihitung terpisah.";
export const RECAP_LATEST_LABEL = "Pelaksanaan terbaru";
export const RECAP_LATEST_NOTE = "Pelaksanaan terbaru menunjukkan tanggal sesi paling baru yang sudah terlaksana dalam periode yang dipilih. Tanda — berarti belum ada sesi terlaksana pada periode tersebut.";
export function isCompletedSheetSession(event: EskulEvent) {
  return event.status.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID") === "sudah terlaksana";
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
}
export function validRecapRange(from: string, to: string) { return validDate(from) && validDate(to) && from <= to; }
export function buildSessionRecap(events: EskulEvent[], from: string, to: string, eskul: EskulKey | "all", fetchedAt: string, enabled: EskulKey[] = ESKUL_ORDER): SessionRecap {
  if (!validRecapRange(from, to)) throw new Error("Pilih rentang tanggal yang valid.");
  const completed = events.filter(event => enabled.includes(event.eskul) && isCompletedSheetSession(event) && event.date >= from && event.date <= to && (eskul === "all" || event.eskul === eskul)).sort((a,b) => a.date.localeCompare(b.date) || a.eskul.localeCompare(b.eskul) || a.time.localeCompare(b.time));
  const rows = enabled.filter(key => eskul === "all" || key === eskul).map(key => {
    const group = completed.filter(event => event.eskul === key);
    return { eskul: key, label: ESKUL_META[key].label, count: group.length, days: new Set(group.map(event => event.date)).size, lastDate: group.at(-1)?.date ?? null };
  });
  return { from, to, eskul, fetchedAt, events: completed, total: completed.length, days: new Set(completed.map(event => event.date)).size, activeEskuls: rows.filter(row => row.count > 0).length, rows };
}
export function recapDate(value: string) { return new Date(`${value}T12:00:00+07:00`).toLocaleDateString("id-ID", {day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Jakarta"}); }
export function recapUpdated(value: string) { return `${new Date(value).toLocaleString("id-ID", {day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jakarta"})} WIB`; }
export const RECAP_COLORS: Record<EskulKey,string> = {renang:"#0284c7",panahan:"#d97706",berkuda:"#059669",taekwondo:"#4f46e5",pramuka:"#7c3aed"};
