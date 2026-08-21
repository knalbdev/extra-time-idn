import Image from "next/image";
import { Icon } from "./Icon";

export function DocumentationSlider({ photos }: { photos: string[] }) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/60 bg-white/60 p-12 text-center">
        <Icon name="photo_library" className="mb-3 text-4xl text-outline" />
        <p className="text-sm text-on-surface-variant">
          Dokumentasi kegiatan akan segera hadir di sini.
        </p>
      </div>
    );
  }

  // Duplicated so the strip can loop seamlessly at the halfway point.
  const loop = [...photos, ...photos];
  const durationSeconds = Math.max(18, photos.length * 5);

  return (
    <div className="group relative -mx-6 overflow-hidden sm:mx-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-surface to-transparent sm:w-24"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-surface to-transparent sm:w-24"
      />

      <div
        className="animate-marquee flex w-max gap-4 group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {loop.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-48 w-64 shrink-0 overflow-hidden rounded-xl border border-outline-variant/40 sm:h-56 sm:w-80"
          >
            <Image
              src={src}
              alt="Dokumentasi kegiatan ekstrakurikuler"
              fill
              sizes="320px"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
