"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Ref } from "react";
import { SPREADSHEET_URL } from "@/lib/constants";
import { Icon } from "./Icon";

export type View = "dashboard" | "schedule" | "laporan";

const NAV_ITEMS: { key: View; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "schedule", label: "Jadwal", icon: "calendar_month" },
  { key: "laporan", label: "Laporan", icon: "summarize" },
];

export function Sidebar({
  active,
  onNavigate,
  open,
  onClose,
  onGoHome,
  ref,
}: {
  active: View;
  onNavigate: (view: View) => void;
  open: boolean;
  onClose: () => void;
  onGoHome?: () => void;
  ref?: Ref<HTMLElement>;
}) {
  return (
    <>
      {open && (
        <div
          aria-hidden
          onClick={onClose}
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        ref={ref}
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] shrink-0 -translate-x-full flex-col overflow-hidden bg-primary py-2 text-on-primary transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-sky-400/15 blur-[90px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 -right-20 h-64 w-64 rounded-full bg-cyan-300/10 blur-[90px]"
        />

        <button
          type="button"
          onClick={onGoHome}
          disabled={!onGoHome}
          title="Kembali ke beranda"
          className="flex flex-col items-start gap-3 rounded-lg px-6 py-8 text-left transition-colors hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent"
        >
          <Image
            src="/idn.png"
            alt="Logo IDN Akhwat"
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-lg object-contain"
          />
          <div className="min-w-0">
            <h1 className="font-heading text-lg font-bold leading-tight text-on-primary">
              SMP SMK IDN Akhwat
            </h1>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-on-primary/60">
              Portal Ekstrakurikuler
            </p>
          </div>
        </button>

        <div className="mt-2 flex flex-1 flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <motion.button
                key={item.key}
                type="button"
                onClick={() => {
                  onNavigate(item.key);
                  onClose();
                }}
                whileHover={{ x: isActive ? 0 : 3 }}
                whileTap={{ scale: 0.97 }}
                className={`relative flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium ${
                  isActive ? "text-on-primary" : "text-on-primary/60 hover:text-on-primary"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-r-lg border-l-4 border-on-primary bg-white/10"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon name={item.icon} className="relative z-10 text-xl" filled={isActive} />
                <span className="relative z-10">{item.label}</span>
              </motion.button>
            );
          })}

          {onGoHome && (
            <motion.button
              type="button"
              onClick={onGoHome}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
              className="mt-2 flex items-center gap-3 rounded-lg border-t border-white/10 px-4 pb-1 pt-4 text-left text-sm font-medium text-on-primary/50 hover:text-on-primary"
            >
              <Icon name="home" className="text-xl" />
              Beranda
            </motion.button>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 px-6 py-4">
          <a
            href={SPREADSHEET_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-on-primary/60 underline decoration-dotted underline-offset-2 transition hover:text-on-primary"
          >
            Lihat spreadsheet sumber
          </a>
          <span className="mt-1 inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-on-primary/80 ring-1 ring-white/10">
            developed by{" "}
            <a
              href="https://www.linkedin.com/in/setianingbudi/"
              target="_blank"
              rel="noreferrer"
              className="ml-1 underline decoration-dotted underline-offset-2 transition hover:text-on-primary"
            >
              blankdev
            </a>
          </span>
        </div>
      </aside>
    </>
  );
}
