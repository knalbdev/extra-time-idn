import { EskulKey } from "@/lib/types";

const PATHS: Record<EskulKey, React.ReactNode> = {
  renang: (
    <>
      <path d="M2 6.5c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
      <path d="M2 12c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
      <path d="M2 17.5c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
    </>
  ),
  panahan: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  berkuda: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.3 8.7l-2 4.6-4.6 2 2-4.6z" fill="currentColor" stroke="none" />
    </>
  ),
  taekwondo: (
    <path d="M12 3l7 3.2v5.3c0 4.6-3 8.3-7 9.7-4-1.4-7-5.1-7-9.7V6.2z" />
  ),
  pramuka: (
    <>
      <path d="M12 4L3 20h18L12 4z" />
      <path d="M9.5 20L12 11l2.5 9" />
    </>
  ),
};

export function EskulIcon({ eskul, className }: { eskul: EskulKey; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[eskul]}
    </svg>
  );
}
