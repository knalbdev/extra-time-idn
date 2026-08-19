export type EskulKey = "renang" | "panahan" | "berkuda" | "taekwondo" | "pramuka";

export type StatusKey = "selesai" | "belum" | "ditiadakan" | "libur" | "terjadwal";

export interface EskulEvent {
  id: string;
  eskul: EskulKey;
  eskulLabel: string;
  weekNo: string;
  date: string; // ISO yyyy-mm-dd
  dateLabel: string; // original Indonesian label, e.g. "Selasa, 4 Agu 2026"
  time: string;
  classes: string[];
  extra?: string; // e.g. "Angkatan 7", "Jenjang SMP", "Sesi 10.00"
  status: string;
  statusNormalized: StatusKey;
  teacher?: string;
  notes?: string;
  result?: string;
  semester?: string;
}

export interface ScheduleResponse {
  events: EskulEvent[];
  fetchedAt: string;
}
