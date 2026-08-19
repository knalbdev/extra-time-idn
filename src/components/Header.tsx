"use client";

import { SPREADSHEET_URL } from "@/lib/constants";
import { formatUpdatedAt } from "@/lib/format";

export function Header({
  fetchedAt,
  loading,
  onRefresh,
}: {
  fetchedAt: string | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-200 sm:h-10 sm:w-10">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3 2 8l10 5 10-5-10-5Z" />
                <path d="M6 10.5V16c0 1 2.5 3 6 3s6-2 6-3v-5.5" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-indigo-600 sm:text-[11px]">
                SMP SMK IDN Akhwat &middot; Bidang Kesiswaan
              </p>
              <h1 className="text-base font-bold leading-tight tracking-tight text-gray-900 sm:text-2xl">
                Jadwal Ekstrakurikuler 2026/2027
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:shadow-md hover:shadow-indigo-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            <span className="hidden sm:inline">{loading ? "Memuat…" : "Refresh"}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-500">
          <a
            href={SPREADSHEET_URL}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-indigo-600"
          >
            Lihat spreadsheet sumber
          </a>
          <p className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {fetchedAt ? `Diperbarui ${formatUpdatedAt(fetchedAt)}` : "Memuat pembaruan…"}
          </p>
        </div>
      </div>
    </header>
  );
}
