"use client";

import { formatUpdatedAt } from "@/lib/format";
import { Icon } from "./Icon";

export function Topbar({
  fetchedAt,
  loading,
  onRefresh,
  onMenuClick,
}: {
  fetchedAt: string | null;
  loading: boolean;
  onRefresh: () => void;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-4 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container lg:hidden"
          aria-label="Buka menu"
        >
          <Icon name="menu" className="text-xl" />
        </button>
        <h2 className="hidden font-heading text-xl font-extrabold text-primary md:block">
          Activity Management
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-xs text-on-surface-variant sm:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-status-completed opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-status-completed" />
          </span>
          {fetchedAt ? `Diperbarui ${formatUpdatedAt(fetchedAt)}` : "Memuat pembaruan…"}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Refresh data"
        >
          <Icon name="refresh" className={`text-xl ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </header>
  );
}
