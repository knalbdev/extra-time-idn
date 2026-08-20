"use client";

import Image from "next/image";
import { SPREADSHEET_URL } from "@/lib/constants";
import { Icon } from "./Icon";

export type View = "dashboard" | "schedule";

const NAV_ITEMS: { key: View; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "schedule", label: "Schedule", icon: "calendar_month" },
];

export function Sidebar({
  active,
  onNavigate,
  open,
  onClose,
}: {
  active: View;
  onNavigate: (view: View) => void;
  open: boolean;
  onClose: () => void;
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] shrink-0 -translate-x-full flex-col bg-primary py-2 text-on-primary transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="flex flex-col items-start gap-3 px-6 py-8">
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
        </div>

        <div className="mt-2 flex flex-1 flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onNavigate(item.key);
                  onClose();
                }}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "rounded-r-lg border-l-4 border-on-primary bg-white/10 text-on-primary"
                    : "text-on-primary/60 hover:bg-white/5 hover:text-on-primary"
                }`}
              >
                <Icon name={item.icon} className="text-xl" filled={isActive} />
                {item.label}
              </button>
            );
          })}
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
