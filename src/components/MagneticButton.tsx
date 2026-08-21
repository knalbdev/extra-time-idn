"use client";

import { HTMLMotionProps, motion, useMotionValue, useSpring } from "framer-motion";
import { PointerEvent } from "react";

interface MagneticButtonProps
  extends Omit<HTMLMotionProps<"button">, "onPointerMove" | "onPointerLeave" | "style"> {
  strength?: number;
}

/** A button that nudges toward the cursor within its bounds, then springs back on leave. */
export function MagneticButton({ strength = 14, children, ...props }: MagneticButtonProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  return (
    <motion.button
      {...props}
      onPointerMove={(e: PointerEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        x.set((relX / (rect.width / 2)) * strength);
        y.set((relY / (rect.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.button>
  );
}
