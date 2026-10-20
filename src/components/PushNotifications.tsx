"use client";

import { useEffect, useRef, useState } from "react";
import { useModalDialog } from "@/lib/use-modal-dialog";
import { Icon } from "./Icon";

const TOKEN_KEY = "idn-push-device-token-v1";
function deviceToken() {
  const saved = localStorage.getItem(TOKEN_KEY);
  if (saved && /^[a-f0-9]{64}$/.test(saved)) return saved;
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map(byte => byte.toString(16).padStart(2, "0")).join("");
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}
function applicationKey(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}
async function readyWorker() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Browser belum siap menerima notifikasi.")), 10000); }),
    ]);
  } finally { clearTimeout(timer); }
}
async function subscriptionRequest(action: "subscribe" | "unsubscribe" | "status" | "test", subscription: PushSubscription) {
  const response = await fetch("/api/push/subscription", {
    method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ action, endpoint: subscription.endpoint, token: deviceToken(), keys: subscription.toJSON().keys }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Pengaturan notifikasi belum dapat diperbarui.");
  return result as { enabled?: boolean; sent?: boolean };
}

export function PushNotifications() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Pengingat jadwal" aria-haspopup="dialog" className="print-hide fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex min-h-12 items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-3 text-sm font-semibold text-primary shadow-lg transition hover:bg-blue-50 sm:right-6 sm:px-5"><Icon name="notifications" className="text-xl"/><span className="hidden sm:inline">Pengingat jadwal</span></button>
    {open && <PushDialog onClose={() => setOpen(false)}/>}
  </>;
}

function PushDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useModalDialog(ref);
  const [config, setConfig] = useState<{ enabled: boolean; publicKey: string | null } | null>(null);
  const [supported, setSupported] = useState(true);
  const [iosInstall, setIosInstall] = useState(false);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    let canceled = false;
    async function initialize() {
      try {
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        const standalone = matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
        const available = isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
        if (canceled) return;
        setIosInstall(ios && !standalone); setSupported(available);
        if (!available || (ios && !standalone)) return;
        setPermission(Notification.permission);
        const response = await fetch("/api/push/config", { cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error("Pengingat belum dapat dimuat. Silakan coba lagi.");
        const result = await response.json();
        if (canceled) return;
        setConfig(result);
        if (!result.enabled) return;
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        const subscription = await registration.pushManager.getSubscription();
        if (subscription && Notification.permission === "granted" && localStorage.getItem(TOKEN_KEY)) {
          const state = await subscriptionRequest("status", subscription);
          if (!canceled) setActive(Boolean(state.enabled));
        }
      } catch { if (!canceled) setError("Pengingat belum dapat dimuat. Periksa koneksi lalu buka kembali menu ini."); }
      finally { if (!canceled) setLoading(false); }
    }
    void initialize();
    return () => { canceled = true; };
  }, []);

  async function enable() {
    if (!config?.publicKey || busy) return;
    setBusy("Mengaktifkan pengingat…"); setError(""); setMessage("");
    try {
      // Request immediately inside this click, preserving Safari's user gesture.
      const granted = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      setPermission(granted);
      if (granted !== "granted") { setMessage("Pengingat belum diaktifkan. Izinkan notifikasi untuk menerima jadwal."); return; }
      const hadToken = Boolean(localStorage.getItem(TOKEN_KEY));
      deviceToken(); // Verify persistent storage before creating a subscription.
      await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const registration = await readyWorker();
      let subscription = await registration.pushManager.getSubscription();
      const key = applicationKey(config.publicKey);
      const oldKey = subscription?.options.applicationServerKey;
      if (subscription && (!hadToken || !oldKey || String(new Uint8Array(oldKey)) !== String(key))) {
        if (hadToken) await subscriptionRequest("unsubscribe", subscription);
        await subscription.unsubscribe(); subscription = null;
      }
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await subscriptionRequest("subscribe", subscription);
      setActive(true); setMessage("Pengingat aktif di perangkat ini. Jadwal akan dikirim mulai pukul 08.00 WIB pada hari kegiatan.");
    } catch {
      setError("Pengingat belum dapat diaktifkan. Periksa koneksi, izin notifikasi, dan izin penyimpanan browser, lalu coba lagi.");
    } finally { setBusy(""); }
  }

  async function act(action: "unsubscribe" | "test") {
    if (busy) return;
    setBusy(action === "test" ? "Mengirim notifikasi uji…" : "Menonaktifkan pengingat…"); setError(""); setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) { setActive(false); throw new Error("Aktifkan kembali pengingat pada perangkat ini."); }
      await subscriptionRequest(action, subscription);
      if (action === "unsubscribe") { await subscription.unsubscribe(); setActive(false); setMessage("Pengingat di perangkat ini sudah dinonaktifkan."); }
      else setMessage("Notifikasi uji sudah dikirim. Jika belum muncul, periksa pengaturan notifikasi dan mode Jangan Ganggu pada perangkat.");
    } catch { setError(action === "test" ? "Notifikasi uji belum dapat dikirim. Tunggu satu menit, lalu coba lagi. Pastikan izin notifikasi masih aktif." : "Pengingat belum dapat dinonaktifkan. Periksa koneksi lalu coba lagi."); }
    finally { setBusy(""); }
  }

  const ready = supported && !iosInstall && config?.enabled;
  return <dialog ref={ref} aria-labelledby="push-title" aria-describedby="push-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="print-hide fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl border-0 bg-white p-6 text-primary shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm sm:p-8">
    <div className="flex items-start justify-between gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-secondary"><Icon name="notifications_active" className="text-3xl"/></span><button type="button" disabled={Boolean(busy)} onClick={onClose} aria-label="Tutup pengingat jadwal" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface disabled:opacity-40"><Icon name="close" className="text-xl"/></button></div>
    <h2 id="push-title" className="mt-5 font-heading text-2xl font-bold">Pengingat jadwal</h2>
    <p id="push-description" className="mt-3 text-sm leading-relaxed text-on-surface-variant">Terima jadwal ekstrakurikuler mulai pukul <strong className="text-primary">08.00 WIB</strong> pada hari kegiatan. Berlaku untuk semua pengguna, tanpa perlu masuk akun.</p>
    <div className="mt-5 rounded-2xl bg-surface p-4 text-sm leading-relaxed">
      {loading ? <p role="status">Memeriksa pengingat…</p> : iosInstall ? <p>Di iPhone atau iPad, buka website melalui Safari, pilih <strong>Bagikan → Tambah ke Layar Utama</strong>, lalu buka dari ikon tersebut untuk mengaktifkan notifikasi. Memerlukan iOS/iPadOS 16.4 atau lebih baru.</p> : !supported ? <p>Browser ini belum mendukung notifikasi. Coba buka melalui Chrome, Edge, Firefox, atau Safari versi terbaru.</p> : !config?.enabled ? <p>Pengingat jadwal belum tersedia. Silakan coba lagi setelah fitur diaktifkan oleh pengelola.</p> : permission === "denied" ? <p>Notifikasi diblokir. Ubah izin notifikasi website menjadi <strong>Izinkan</strong> melalui pengaturan browser, lalu buka kembali menu ini.</p> : <p className={active ? "font-semibold text-emerald-700" : "text-on-surface-variant"}>{active ? "✓ Aktif pada perangkat ini" : "Belum aktif pada perangkat ini"}</p>}
    </div>
    {message && <p role="status" className="mt-4 text-sm leading-relaxed text-emerald-700">{message}</p>}
    {error && <p role="alert" className="mt-4 text-sm leading-relaxed text-red-700">{error}</p>}
    {ready && !loading && <div className="mt-5 flex flex-col gap-3" aria-busy={Boolean(busy)}>
      {active ? <><button type="button" disabled={Boolean(busy)} onClick={() => void act("test")} className="min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy || "Kirim notifikasi uji"}</button><button type="button" disabled={Boolean(busy)} onClick={() => void act("unsubscribe")} className="min-h-12 rounded-xl border border-outline-variant px-4 py-3 text-sm font-semibold disabled:opacity-50">Nonaktifkan pada perangkat ini</button></> : <button type="button" disabled={Boolean(busy) || permission === "denied"} onClick={() => void enable()} className="min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy || "Aktifkan notifikasi jadwal"}</button>}
      <p className="text-xs leading-relaxed text-on-surface-variant">Izin berlaku per perangkat. Tidak ada notifikasi jika tidak ada kegiatan. Waktu muncul bergantung pada koneksi dan pengaturan perangkat.</p>
    </div>}
  </dialog>;
}
