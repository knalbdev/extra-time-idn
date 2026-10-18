import Papa from "papaparse";
import { CLASS_LIST, ESKUL_META, ESKUL_ORDER, SMK_CLASSES, SMP_CLASSES, SPREADSHEET_ID } from "./constants";
import { EskulEvent, EskulKey, StatusKey } from "./types";

type SheetTable = { headers: string[]; rows: string[][]; revised: boolean };
const MONTH_MAP: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, jun: 6, jul: 7, agu: 8, sep: 9, okt: 10, nov: 11, des: 12 };
const canonical = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const clean = (value: string | undefined) => value?.trim() || undefined;

function parseDate(raw: string | undefined): { iso: string; label: string } | null {
  const label = clean(raw);
  if (!label) return null;
  let day: number, month: number, year: number;
  const iso = label.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const numeric = label.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const indo = label.match(/(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})/);
  if (iso) [, year, month, day] = iso.map(Number);
  else if (numeric) [, day, month, year] = numeric.map(Number);
  else if (indo) { day = Number(indo[1]); month = MONTH_MAP[indo[2].toLowerCase().slice(0, 3)]; year = Number(indo[3]); }
  else return null;
  if (!month || month > 12 || day < 1 || day > 31) return null;
  const result = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (new Date(`${result}T00:00:00Z`).toISOString().slice(0, 10) !== result) return null;
  return { iso: result, label };
}

function extractClasses(raw: string | undefined): string[] {
  if (!raw) return [];
  const lower = raw.toLowerCase();
  const smp = /\bsmp\b/.test(lower), smk = /\bsmk\b/.test(lower);
  if (smp && smk) return [...CLASS_LIST];
  if (smp) return [...SMP_CLASSES];
  if (smk) return [...SMK_CLASSES];
  if (/(semua|seluruh)\s+(jenjang|kelas|siswa)/.test(lower)) return [...CLASS_LIST];
  return CLASS_LIST.filter(name => new RegExp(`(?:^|[^0-9A-Za-z])${name.replace(" ", "\\s+")}(?![0-9A-Za-z])`, "i").test(` ${raw} `));
}

function normalizeStatus(raw: string | undefined): StatusKey {
  const value = (raw || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (value.includes("tiada") || value.includes("batal")) return "ditiadakan";
  if (value.includes("libur")) return "libur";
  if (value.includes("belum")) return "belum";
  if (/\b(?:sudah|telah) (?:terlaksana|dilaksanakan|selesai)\b|^(?:terlaksana|selesai)$/.test(value)) return "selesai";
  return "terjadwal";
}

function table(rows: string[][], sheet: string): SheetTable {
  const index = rows.findIndex(row => {
    const names = row.map(canonical);
    return (names.some(name => name.startsWith("tanggal") || name.endsWith("tanggal")) && names.some(name => name.includes("kelas")))
      || (names.includes("ekstrakurikuler") && names.includes("waktu"));
  });
  if (index < 0) {
    if (rows.length <= 1) return { headers: [], rows: [], revised: false };
    throw new Error(`Susunan kolom jadwal ${sheet} belum dapat dibaca. Silakan hubungi admin.`);
  }
  const headers = rows[index].map(canonical);
  return { headers, rows: rows.slice(index + 1), revised: headers.includes("jenisbaris") };
}
function column(t: SheetTable, patterns: RegExp[], fallback: number, occurrence = 0) {
  for (const pattern of patterns) {
    const matches = t.headers.flatMap((name, index) => pattern.test(name) ? [index] : []);
    if (matches.length) return matches[occurrence] ?? fallback;
  }
  return fallback;
}
const DATE = [/^tanggal/, /tanggal$/];
const CLASSES = [/^kelaspeserta$/, /^kelasyang(?:ikut|bergiliran)$/, /^kelas$/];
const STATUS = [/^statuspelaksanaan\d*$/, /^statussesi\d+$/, /^status\d*$/];
const WEEK = [/^mingguke$/, /^pekan$/, /^no$/];
const TEACHER = [/^gurupendamping$/, /^guru\d*$/];
const RESULT = [/^hasilpenilaiandokumentasi$/, /^hasil$/];

async function fetchTable(sheet: string): Promise<SheetTable> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    if (!response.ok || response.headers.get("content-type")?.includes("text/html")) throw new Error("Unavailable CSV");
    const parsed = Papa.parse<string[]>(await response.text(), { skipEmptyLines: "greedy" });
    if (parsed.errors.some(error => error.code !== "UndetectableDelimiter")) throw new Error("Invalid CSV");
    return table(parsed.data, sheet);
  } catch {
    throw new Error(`Jadwal ${sheet} belum dapat dimuat. Periksa koneksi lalu coba lagi. Jika masih terkendala, hubungi admin.`);
  }
}

function parseEvents(t: SheetTable, eskul: EskulKey): EskulEvent[] {
  const events: EskulEvent[] = [];
  // The current workbook has one session per row; its program tabs are
  // formula views of Jadwal Induk, including the actual execution status.
  const singleSession = t.headers.includes("kelaspeserta") && t.headers.includes("mulai");
  const dateIndex = column(t, DATE, ["berkuda", "taekwondo"].includes(eskul) ? 2 : 1);
  const weekIndex = column(t, WEEK, singleSession ? -1 : 0);
  const slots = eskul === "panahan" && !singleSession ? [0, 1] : [0];
  for (const [rowIndex, row] of t.rows.entries()) {
    const date = parseDate(row[dateIndex]);
    if (!date) continue;
    const weekNo = clean(row[weekIndex]) ?? "";
    for (const slot of slots) {
      const classIndex = singleSession ? column(t, CLASSES, -1) : eskul === "panahan" ? column(t, [new RegExp(`^sesi${slot + 1}kelas$`), new RegExp(`^kelas${slot + 1}$`)], slot ? 6 : 2)
        : column(t, CLASSES, ["berkuda", "taekwondo"].includes(eskul) ? 4 : 2);
      const rawClasses = clean(row[classIndex]);
      if (eskul === "panahan" && !rawClasses) continue;
      const statusIndex = column(t, STATUS, eskul === "panahan" ? (slot ? 9 : 5) : eskul === "pramuka" ? 3 : eskul === "renang" ? 4 : 5, slot);
      const status = clean(row[statusIndex]) ?? "";
      const notes = clean(row[column(t, [/^catatan$/], eskul === "panahan" ? 11 : eskul === "pramuka" ? 5 : eskul === "renang" ? 6 : 7)]);
      const rowKind = clean(row[column(t, [/^jenisbaris$/], -1)]);
      const start = singleSession ? clean(row[column(t, [/^mulai$/], -1)]) : undefined;
      const end = singleSession ? clean(row[column(t, [/^selesai$/], -1)]) : undefined;
      const explicitTime = singleSession ? [start, end].filter(Boolean).join(" - ") || undefined : clean(row[column(t, eskul === "panahan" ? [new RegExp(`^jamsesi${slot + 1}$`), new RegExp(`^jam${slot + 1}$`)] : [/^waktu$/, /^jam$/], eskul === "panahan" ? (slot ? 7 : 3) : -1)]);
      const fallback = { renang: "Ba'da Ashar", panahan: slot ? "13.00" : "10.00", berkuda: "14.00 (berangkat dari IDN)", taekwondo: "09.00 - 11.00", pramuka: "08.00 - 11.00" }[eskul];
      const time = (explicitTime ?? fallback).replace(/(\d)[,:](\d{2})/g, "$1.$2");
      const classes = extractClasses(rawClasses);
      const group = clean(row[column(t, [/^kelompok$/, /^angkatan$/, /^jenjang$/], ["berkuda", "taekwondo"].includes(eskul) ? 3 : -1)]);
      events.push({
        id: singleSession ? `${eskul}-${date.iso}-${encodeURIComponent(time)}-${encodeURIComponent(classes.join("|"))}` : `${eskul}-${date.iso}-${weekNo || rowIndex}-${slot}`,
        eskul, eskulLabel: ESKUL_META[eskul].label, weekNo, date: date.iso, dateLabel: date.label,
        time, classes: classes.length ? classes : rawClasses ? [rawClasses] : [], status, statusNormalized: normalizeStatus(status),
        teacher: clean(row[column(t, TEACHER, singleSession ? -1 : eskul === "panahan" ? (slot ? 8 : 4) : eskul === "renang" ? 3 : -1, slot)]),
        result: clean(row[column(t, RESULT, singleSession ? -1 : eskul === "panahan" ? 10 : eskul === "pramuka" ? 4 : eskul === "renang" ? 5 : 6)]),
        notes, semester: clean(row[column(t, [/^semester$/], ["berkuda", "taekwondo"].includes(eskul) ? 1 : -1)]),
        extra: [eskul === "panahan" ? `Sesi ${time}` : eskul === "taekwondo" && group ? `Jenjang ${group}` : group, rowKind && rowKind !== "HISTORIS TERKUNCI" && rowKind !== "RENCANA TETAP" ? rowKind : undefined].filter(Boolean).join(" · ") || undefined,
      });
    }
  }
  return events;
}

type CombinedEvent = { eskul: EskulKey; date: string; time: string; classes: string[] };
function parseCombined(t: SheetTable): CombinedEvent[] {
  const result: CombinedEvent[] = [];
  for (const row of t.rows) {
    const eskul = ESKUL_ORDER.find(key => canonical(row[column(t, [/^ekstrakurikuler$/], 3)] ?? "") === canonical(ESKUL_META[key].label));
    const date = parseDate(row[column(t, DATE, 0)]);
    const time = clean(row[column(t, [/^waktu$/], 2)]);
    if (eskul && date && time) result.push({ eskul, date: date.iso, time: time.replace(/(\d)[,:](\d{2})/g, "$1.$2").replace(/[–—]/g, " - "), classes: extractClasses(row[column(t, CLASSES, 5)]) });
  }
  return result;
}
const startTime = (time: string) => time.match(/\d{1,2}[.:,]\d{2}/)?.[0].replace(/[:,]/g, ".");
const joinValues = (values: (string | undefined)[]) => [...new Set(values.filter(Boolean))].join(" · ") || undefined;

function reconcile(events: EskulEvent[], combined: CombinedEvent[]): EskulEvent[] {
  const matches = new Map<CombinedEvent, EskulEvent[]>();
  for (const event of events) {
    const match = combined.find(row => row.eskul === event.eskul && row.date === event.date
      && event.classes.length > 0 && event.classes.every(name => row.classes.includes(name))
      && (event.eskul !== "panahan" || startTime(row.time) === startTime(event.time)));
    if (!match) throw new Error(`Jadwal ${event.eskulLabel} tanggal ${event.date} belum sesuai dengan tab Jadwal Gabungan. Silakan hubungi admin.`);
    const list = matches.get(match) ?? [];
    list.push(event); matches.set(match, list);
  }
  const output: EskulEvent[] = [];
  for (const [match, group] of matches) {
    // A combined riding trip is one schedule even when two grades participate.
    // Keep different actual attendance statuses separate until they agree.
    const classes = CLASS_LIST.filter(name => group.some(event => event.classes.includes(name)));
    const merge = group.length > 1 && match.eskul === "berkuda" && classes.length === match.classes.length && group.every(event => event.status === group[0].status);
    const enriched = (event: EskulEvent) => ({ ...event, time: match.time, extra: event.eskul === "panahan" ? event.extra?.replace(/^Sesi [^·]+/, `Sesi ${match.time} `).trim() : event.extra });
    if (!merge) { output.push(...group.map(enriched)); continue; }
    output.push({ ...enriched(group[0]), id: `berkuda-${match.date}-${classes.join("-")}`, classes, weekNo: group.map(event => event.weekNo).join(" / "), extra: joinValues(group.map(event => event.extra)), teacher: joinValues(group.map(event => event.teacher)), notes: joinValues(group.map(event => event.notes)), result: joinValues(group.map(event => event.result)) });
  }
  // A missing program row must not silently remove a schedule from the calendar.
  for (const row of combined) if (events.some(event => event.eskul === row.eskul) && !matches.has(row)) throw new Error(`Ada jadwal ${ESKUL_META[row.eskul].label} yang belum sesuai antara tab kegiatan dan Jadwal Gabungan. Silakan hubungi admin.`);
  return output;
}

export async function getAllEvents(enabled: EskulKey[] = ESKUL_ORDER): Promise<EskulEvent[]> {
  const keys = ESKUL_ORDER.filter(key => enabled.includes(key));
  if (!keys.length) return [];
  const sources = await Promise.all(keys.map(async key => ({ key, table: await fetchTable(ESKUL_META[key].sheet) })));
  const events = sources.flatMap(source => parseEvents(source.table, source.key));
  // Program tabs retain the actual status, teacher and notes. The revised
  // combined calendar supplies times and represents shared riding trips once.
  const result = sources.some(source => source.table.revised) ? reconcile(events, parseCombined(await fetchTable("Jadwal Gabungan"))) : events;
  if (new Set(result.map(event => event.id)).size !== result.length) throw new Error("Ada jadwal dengan identitas ganda. Silakan hubungi admin untuk memeriksa spreadsheet.");
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.eskul.localeCompare(b.eskul) || (startTime(a.time) ?? "").localeCompare(startTime(b.time) ?? ""));
}
