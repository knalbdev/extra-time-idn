"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString("id-ID"));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [value, motionValue]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
