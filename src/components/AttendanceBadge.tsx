import { ATTENDANCE, Attendance } from "@/lib/coach-sessions";

export const attendanceColors: Record<Attendance, string> = {
  hadir: "border-emerald-200 bg-emerald-50 text-emerald-800",
  izin: "border-amber-200 bg-amber-50 text-amber-800",
  sakit: "border-orange-200 bg-orange-50 text-orange-800",
  alpa: "border-rose-200 bg-rose-50 text-rose-800",
};

export function AttendanceBadge({ value }: { value?: Attendance }) {
  return <span className={`inline-flex whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-semibold ${value ? attendanceColors[value] : "border-slate-200 bg-slate-50 text-slate-600"}`}>{value ? ATTENDANCE[value] : "Belum dicatat"}</span>;
}
