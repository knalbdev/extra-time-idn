import Papa from "papaparse";
import { CLASS_LIST, ESKUL_META, SMK_CLASSES, SMP_CLASSES, SPREADSHEET_ID } from "./constants";
import { EskulEvent, StatusKey } from "./types";

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  mei: 4,
  jun: 5,
  jul: 6,
  agu: 7,
  sep: 8,
  okt: 9,
  nov: 10,
  des: 11,
};

function parseIndoDate(raw: string | undefined): { iso: string; label: string } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const m = trimmed.match(/(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monKey = m[2].toLowerCase().slice(0, 3);
  const month = MONTH_MAP[monKey];
  if (month === undefined) return null;
  const year = parseInt(m[3], 10);
  const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { iso, label: trimmed };
}

function extractClasses(text: string | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const hasSmp = /\bsmp\b/.test(lower);
  const hasSmk = /\bsmk\b/.test(lower);

  // "Semua jenjang" / "seluruh kelas" style entries apply to every class —
  // expand them so month/class filtering still matches, rather than losing
  // the info as an empty (and misleadingly "undetermined") class list.
  if (/(semua|seluruh)\s+(jenjang|kelas|siswa)/.test(lower) || (hasSmp && hasSmk)) {
    return [...CLASS_LIST];
  }
  if (hasSmp) return [...SMP_CLASSES];
  if (hasSmk) return [...SMK_CLASSES];

  const found: string[] = [];
  const padded = ` ${text} `;
  for (const c of CLASS_LIST) {
    const pattern = c.replace(" ", "\\s+");
    const re = new RegExp(`(?:^|[^0-9A-Za-z])${pattern}(?![0-9A-Za-z])`, "i");
    if (re.test(padded)) found.push(c);
  }
  return found;
}

function normalizeStatus(raw: string | undefined): StatusKey {
  const s = (raw || "").trim().toLowerCase();
  if (!s) return "terjadwal";
  if (s.includes("sudah")) return "selesai";
  if (s.includes("belum")) return "belum";
  if (s.includes("tiada")) return "ditiadakan";
  if (s.includes("libur")) return "libur";
  return "terjadwal";
}

function clean(v: string | undefined): string | undefined {
  const t = (v || "").trim();
  return t.length ? t : undefined;
}

async function fetchSheetRows(sheetName: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    sheetName,
  )}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Gagal memuat sheet "${sheetName}" (status ${res.status})`);
  }
  const text = await res.text();
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  return parsed.data;
}

function parseRenang(rows: string[][]): EskulEvent[] {
  const events: EskulEvent[] = [];
  for (const row of rows.slice(1)) {
    const d = parseIndoDate(row[1]);
    if (!d) continue;
    const classes = extractClasses(row[2]);
    events.push({
      id: `renang-${d.iso}-${row[2]}`,
      eskul: "renang",
      eskulLabel: ESKUL_META.renang.label,
      weekNo: clean(row[0]) ?? "",
      date: d.iso,
      dateLabel: d.label,
      time: "Ba'da Ashar",
      classes: classes.length ? classes : row[2] ? [row[2].trim()] : [],
      status: clean(row[4]) ?? "",
      statusNormalized: normalizeStatus(row[4]),
      teacher: clean(row[3]),
      result: clean(row[5]),
      notes: clean(row[6]),
    });
  }
  return events;
}

function parsePanahan(rows: string[][]): EskulEvent[] {
  const events: EskulEvent[] = [];
  for (const row of rows.slice(1)) {
    const d = parseIndoDate(row[1]);
    if (!d) continue;
    const sessions: Array<{ suffix: string; time: string; kelas: number; guru: number; status: number }> = [
      { suffix: "10", time: "10.00", kelas: 2, guru: 3, status: 4 },
      { suffix: "13", time: "13.00", kelas: 5, guru: 6, status: 7 },
    ];
    for (const s of sessions) {
      const kelasRaw = row[s.kelas];
      if (!clean(kelasRaw)) continue;
      const classes = extractClasses(kelasRaw);
      events.push({
        id: `panahan-${d.iso}-${s.suffix}`,
        eskul: "panahan",
        eskulLabel: ESKUL_META.panahan.label,
        weekNo: clean(row[0]) ?? "",
        date: d.iso,
        dateLabel: d.label,
        time: s.time,
        extra: `Sesi ${s.time}`,
        classes: classes.length ? classes : [kelasRaw.trim()],
        status: clean(row[s.status]) ?? "",
        statusNormalized: normalizeStatus(row[s.status]),
        teacher: clean(row[s.guru]),
        result: clean(row[8]),
        notes: clean(row[9]),
      });
    }
  }
  return events;
}

function parseBerkuda(rows: string[][]): EskulEvent[] {
  const events: EskulEvent[] = [];
  for (const row of rows.slice(1)) {
    const d = parseIndoDate(row[2]);
    if (!d) continue;
    const rawClasses = clean(row[4]);
    const classes = extractClasses(rawClasses);
    events.push({
      id: `berkuda-${d.iso}-${row[3]}`,
      eskul: "berkuda",
      eskulLabel: ESKUL_META.berkuda.label,
      weekNo: clean(row[0]) ?? "",
      date: d.iso,
      dateLabel: d.label,
      time: "14.00 (berangkat dari IDN)",
      extra: clean(row[3]),
      classes: classes.length ? classes : rawClasses ? [rawClasses] : [],
      status: clean(row[5]) ?? "",
      statusNormalized: normalizeStatus(row[5]),
      semester: clean(row[1]),
      result: clean(row[6]),
      notes: clean(row[7]),
    });
  }
  return events;
}

function parseTaekwondo(rows: string[][]): EskulEvent[] {
  const events: EskulEvent[] = [];
  for (const row of rows.slice(1)) {
    const d = parseIndoDate(row[2]);
    if (!d) continue;
    const rawClasses = clean(row[4]);
    const classes = extractClasses(rawClasses);
    events.push({
      id: `taekwondo-${d.iso}-${row[3]}`,
      eskul: "taekwondo",
      eskulLabel: ESKUL_META.taekwondo.label,
      weekNo: clean(row[0]) ?? "",
      date: d.iso,
      dateLabel: d.label,
      time: "09.00 - 11.00",
      extra: clean(row[3]) ? `Jenjang ${row[3].trim()}` : undefined,
      classes: classes.length ? classes : rawClasses ? [rawClasses] : [],
      status: clean(row[5]) ?? "",
      statusNormalized: normalizeStatus(row[5]),
      semester: clean(row[1]),
      result: clean(row[6]),
      notes: clean(row[7]),
    });
  }
  return events;
}

function parsePramuka(rows: string[][]): EskulEvent[] {
  const events: EskulEvent[] = [];
  for (const row of rows.slice(1)) {
    const d = parseIndoDate(row[1]);
    if (!d) continue;
    const rawClasses = clean(row[2]);
    const classes = extractClasses(rawClasses);
    events.push({
      id: `pramuka-${d.iso}`,
      eskul: "pramuka",
      eskulLabel: ESKUL_META.pramuka.label,
      weekNo: clean(row[0]) ?? "",
      date: d.iso,
      dateLabel: d.label,
      time: "08.00 - 11.00",
      classes: classes.length ? classes : rawClasses ? [rawClasses] : [],
      status: clean(row[3]) ?? "",
      statusNormalized: normalizeStatus(row[3]),
      result: clean(row[4]),
      notes: clean(row[5]),
    });
  }
  return events;
}

export async function getAllEvents(): Promise<EskulEvent[]> {
  const [renang, panahan, berkuda, taekwondo, pramuka] = await Promise.all([
    fetchSheetRows(ESKUL_META.renang.sheet).then(parseRenang),
    fetchSheetRows(ESKUL_META.panahan.sheet).then(parsePanahan),
    fetchSheetRows(ESKUL_META.berkuda.sheet).then(parseBerkuda),
    fetchSheetRows(ESKUL_META.taekwondo.sheet).then(parseTaekwondo),
    fetchSheetRows(ESKUL_META.pramuka.sheet).then(parsePramuka),
  ]);

  return [...renang, ...panahan, ...berkuda, ...taekwondo, ...pramuka].sort((a, b) =>
    a.date === b.date ? a.eskul.localeCompare(b.eskul) : a.date.localeCompare(b.date),
  );
}
