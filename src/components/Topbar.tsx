"use client";

import { motion } from "framer-motion";
import { formatUpdatedAt } from "@/lib/format";
import { Icon } from "./Icon";
import { MagneticButton } from "./MagneticButton";

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
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-outline-variant bg-surface px-4 sm:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container lg:hidden"
        aria-label="Buka menu"
      >
        <Icon name="menu" className="text-xl" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <motion.span
          key={fetchedAt ?? "loading"}
          initial={{ backgroundColor: "rgba(16,185,129,0.35)" }}
          animate={{ backgroundColor: "rgba(0,0,0,0)" }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-on-surface-variant ring-1 ring-surface-container sm:flex"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-status-completed opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-status-completed" />
          </span>
          {fetchedAt ? `Diperbarui ${formatUpdatedAt(fetchedAt)}` : "Memuat pembaruan…"}
        </motion.span>
        <MagneticButton
          strength={8}
          onClick={onRefresh}
          disabled={loading}
          whileTap={{ scale: 0.9 }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Refresh data"
        >
          <Icon name="refresh" className={`text-xl ${loading ? "animate-spin" : ""}`} />
        </MagneticButton>
      </div>
    </header>
  );
}
