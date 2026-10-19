// Calendar arithmetic uses UTC solely for date-only values. The current date
// comes separately from Asia/Jakarta; device timezone and DST cannot move cells.
export function shiftCalendarMonth(month: string, offset: number): string {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function calendarMonthWeeks(month: string): string[][] {
  const [year, number] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday first.
  const days = Array.from({ length: 42 }, (_, index) =>
    new Date(Date.UTC(year, number - 1, 1 - offset + index)).toISOString().slice(0, 10),
  );
  return Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7));
}
