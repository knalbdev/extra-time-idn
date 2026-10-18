"use client";

import { createContext, ReactNode, useContext, useRef, useState, useTransition } from "react";
import { useModalDialog } from "@/lib/use-modal-dialog";

type Notice = { text: string; kind: "success" | "error" };
type Question = { title: string; description: string; confirmLabel: string };
type Feedback = {
  busy: boolean;
  run: (title: string, work: () => Promise<void>) => Promise<boolean>;
  notify: (text: string, kind?: Notice["kind"]) => void;
  ask: (question: Question) => Promise<boolean>;
};
const Context = createContext<Feedback | null>(null);

export function usePortalFeedback() {
  const value = useContext(Context);
  if (!value) throw new Error("PortalFeedbackProvider is required");
  return value;
}

function Modal({ children, label, description, onCancel }: { children: ReactNode; label: string; description?: string; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useModalDialog(ref);
  return <dialog ref={ref} tabIndex={-1} aria-labelledby={label} aria-describedby={description} onCancel={event => { event.preventDefault(); onCancel(); }} className="portal-modal print-hide fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl border-0 bg-white p-6 text-primary shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm sm:p-8">{children}</dialog>;
}

export function PortalFeedbackProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  const resolveQuestion = useRef<((answer: boolean) => void) | null>(null);
  const busy = Boolean(loading) || pending;
  function notify(text: string, kind: Notice["kind"] = "success") { setNotice({ text, kind }); }
  async function run(title: string, work: () => Promise<void>): Promise<boolean> {
    if (locked.current) return false;
    locked.current = true;
    setNotice(null);
    setLoading(title);
    return new Promise(resolve => startTransition(async () => {
      try {
        // Give the browser a paint before preparing a local report/export, too.
        await new Promise<void>(paint => requestAnimationFrame(() => requestAnimationFrame(() => paint())));
        await work();
        resolve(true);
      } catch {
        notify("Proses belum dapat diselesaikan. Periksa koneksi, lalu perbarui data untuk memastikan hasilnya sebelum mencoba lagi.", "error");
        resolve(false);
      } finally { locked.current = false; setLoading(""); }
    }));
  }
  function ask(value: Question) {
    if (locked.current || resolveQuestion.current) return Promise.resolve(false);
    setQuestion(value);
    return new Promise<boolean>(resolve => { resolveQuestion.current = resolve; });
  }
  function answer(value: boolean) {
    setQuestion(null);
    resolveQuestion.current?.(value);
    resolveQuestion.current = null;
  }
  return <Context.Provider value={{ busy, run, notify, ask }}>
    {children}
    {notice && !busy && <div className={`print-hide pointer-events-none fixed inset-x-3 bottom-4 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-2xl border p-4 shadow-xl sm:inset-x-6 sm:bottom-6 ${notice.kind === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-bold">{notice.kind === "error" ? "!" : "✓"}</span>
      <p role={notice.kind === "error" ? "alert" : "status"} className="min-w-0 flex-1 break-words text-sm leading-relaxed">{notice.text}</p>
      <button type="button" aria-label="Tutup pemberitahuan" onClick={() => setNotice(null)} className="pointer-events-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white">×</button>
    </div>}
    {question && <Modal label="portal-confirm-title" description="portal-confirm-description" onCancel={() => answer(false)}>
      <div aria-hidden="true" className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-700">↗</div>
      <h2 id="portal-confirm-title" className="font-heading text-xl font-bold">{question.title}</h2>
      <p id="portal-confirm-description" className="mt-3 text-sm leading-relaxed text-on-surface-variant">{question.description}</p>
      <div className="mt-7 grid grid-cols-2 gap-3"><button autoFocus type="button" onClick={() => answer(false)} className="rounded-xl border border-outline-variant px-4 py-3 text-sm font-semibold">Batal</button><button type="button" onClick={() => answer(true)} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white">{question.confirmLabel}</button></div>
    </Modal>}
    {busy && <Modal label="portal-loading-title" description="portal-loading-description" onCancel={() => {}}>
      <div role="status" aria-live="polite" className="py-3 text-center"><span aria-hidden="true" className="mx-auto mb-6 block h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600 motion-reduce:animate-none" /><h2 id="portal-loading-title" className="font-heading text-xl font-bold">{loading || "Sebentar, ya…"}</h2><p id="portal-loading-description" className="mt-3 text-sm leading-relaxed text-on-surface-variant">Mohon tunggu sebentar sampai proses selesai.</p></div>
    </Modal>}
  </Context.Provider>;
}
