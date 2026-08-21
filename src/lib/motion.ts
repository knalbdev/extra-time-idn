import type { Variants } from "framer-motion";

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

// For longer lists (e.g. a month's worth of schedule rows) — same reveal,
// tighter stagger so a big list doesn't take forever to finish animating in.
export const staggerContainerFast: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.025 },
  },
};

export const fadeInItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};
