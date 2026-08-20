import { EskulKey, StatusBucket, StatusKey } from "./types";

export const SPREADSHEET_ID = "1-GI5Qt_pDLMV3Gty8Cc2X9u12VY_q9upN_6hr0V-VP8";

export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;

export const SMP_CLASSES = ["7A", "7B", "8A", "8B", "9A", "9B"] as const;

export const SMK_CLASSES = ["10 RPL", "10 DKV", "11 RPL", "11 DKV"] as const;

export const CLASS_LIST = [...SMP_CLASSES, ...SMK_CLASSES] as const;

export const CLASS_GROUPS = [
  { label: "SMP", classes: SMP_CLASSES },
  { label: "SMK", classes: SMK_CLASSES },
] as const;

export const ESKUL_META: Record<
  EskulKey,
  {
    label: string;
    sheet: string;
    chip: string;
    border: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  renang: {
    label: "Renang",
    sheet: "Renang",
    chip: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    border: "border-l-sky-400",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  panahan: {
    label: "Panahan",
    sheet: "Panahan",
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    border: "border-l-amber-400",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  berkuda: {
    label: "Berkuda",
    sheet: "Berkuda",
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    border: "border-l-emerald-400",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  taekwondo: {
    label: "Taekwondo",
    sheet: "Taekwondo",
    chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    border: "border-l-rose-400",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  pramuka: {
    label: "Pramuka",
    sheet: "Pramuka",
    chip: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    border: "border-l-violet-400",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
};

export const ESKUL_ORDER: EskulKey[] = [
  "renang",
  "panahan",
  "berkuda",
  "taekwondo",
  "pramuka",
];

export const STATUS_BUCKET_META: Record<
  StatusBucket,
  { label: string; dot: string; badge: string }
> = {
  completed: {
    label: "Completed",
    dot: "bg-status-completed",
    badge: "status-badge-completed",
  },
  upcoming: {
    label: "Upcoming",
    dot: "bg-status-upcoming",
    badge: "status-badge-upcoming",
  },
  canceled: {
    label: "Holiday/Canceled",
    dot: "bg-status-canceled",
    badge: "status-badge-canceled",
  },
};

export const STATUS_META: Record<
  StatusKey,
  { label: string; bucket: StatusBucket }
> = {
  selesai: { label: "Sudah Terlaksana", bucket: "completed" },
  terjadwal: { label: "Terjadwal", bucket: "upcoming" },
  belum: { label: "Belum Terlaksana", bucket: "upcoming" },
  ditiadakan: { label: "Ditiadakan", bucket: "canceled" },
  libur: { label: "Libur", bucket: "canceled" },
};

export const MONTH_LABELS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const DAY_LABELS_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
