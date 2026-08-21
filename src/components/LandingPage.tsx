"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import { ESKUL_META, ESKUL_ORDER } from "@/lib/constants";
import { fadeInItem, staggerContainer } from "@/lib/motion";
import { CursorGlow } from "./CursorGlow";
import { DocumentationSlider } from "./DocumentationSlider";
import { EskulIcon } from "./EskulIcon";
import { Icon } from "./Icon";
import { MagneticButton } from "./MagneticButton";

export function LandingPage({
  photos,
  onEnter,
}: {
  photos: string[];
  onEnter: () => void;
}) {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <div className="min-h-screen bg-surface">
      <CursorGlow darkZoneRef={heroRef} />

      <header ref={heroRef} className="relative isolate overflow-hidden bg-primary text-on-primary">
        <Image
          src="/sekolah.jpg"
          alt="SMP SMK IDN Akhwat"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/75 via-primary/80 to-primary" />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-sky-400/25 blur-[110px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-0 h-[320px] w-[320px] rounded-full bg-cyan-300/15 blur-[100px]"
        />

        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Image
              src="/idn.png"
              alt="Logo IDN Akhwat"
              width={84}
              height={84}
              className="h-20 w-20 rounded-2xl object-contain shadow-[0_0_30px_rgba(56,189,248,0.35)] sm:h-24 sm:w-24"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-sky-200/80"
          >
            SMP SMK IDN Akhwat
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 bg-gradient-to-r from-white via-sky-100 to-cyan-300 bg-clip-text font-heading text-3xl font-bold tracking-tight text-transparent sm:text-5xl"
          >
            Portal Ekstrakurikuler
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-4 max-w-xl text-sm text-on-primary/80 sm:text-base"
          >
            Pantau jadwal Renang, Panahan, Berkuda, Taekwondo, dan Pramuka dalam satu tempat —
            selalu sinkron dengan data terbaru.
          </motion.p>

          <MagneticButton
            onClick={onEnter}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(56,189,248,0.45)" }}
            whileTap={{ scale: 0.96 }}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary shadow-md"
          >
            Lihat Jadwal
            <Icon name="arrow_forward" className="text-lg" />
          </MagneticButton>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Ekstrakurikuler Kami
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Lima kegiatan pilihan untuk mengembangkan minat dan karakter siswa.
          </p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-8 flex flex-wrap items-stretch justify-center gap-3"
        >
          {ESKUL_ORDER.map((key) => {
            const meta = ESKUL_META[key];
            return (
              <motion.div
                key={key}
                variants={fadeInItem}
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="card flex items-center gap-3 rounded-xl px-4 py-3"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.iconBg}`}>
                  <EskulIcon eskul={key} className={`h-5 w-5 ${meta.iconColor}`} />
                </span>
                <span className="text-left">
                  <span className="block text-sm font-bold text-on-surface">{meta.label}</span>
                  <span className="block max-w-[180px] text-xs text-on-surface-variant">
                    {meta.description}
                  </span>
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="mt-16">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              Dokumentasi Kegiatan
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Momen-momen dari berbagai ekstrakurikuler di SMP SMK IDN Akhwat.
            </p>
          </div>

          <div className="mt-8">
            <DocumentationSlider photos={photos} />
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-on-surface-variant">
            Ingin lihat jadwal lengkap dan status terbaru tiap kegiatan?
          </p>
          <MagneticButton
            onClick={onEnter}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-sm"
          >
            Buka Portal Ekstrakurikuler
            <Icon name="arrow_forward" className="text-lg" />
          </MagneticButton>
        </div>
      </main>

      <footer className="border-t border-outline-variant/50 bg-white/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-8 text-center">
          <p className="text-xs text-on-surface-variant/70">&copy; IDN Akhwat 2026</p>
          <span className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant/60">
            developed by{" "}
            <a
              href="https://www.linkedin.com/in/setianingbudi/"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:text-primary"
            >
              blankdev
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
