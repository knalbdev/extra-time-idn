"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { RefObject, useEffect, useState } from "react";

/**
 * A soft glowing blob that trails the cursor across the whole viewport
 * (fixed positioning, so it tracks through scrolling too). Switches color
 * and blend mode depending on whether the cursor is inside `darkZoneRef`
 * (e.g. the dark hero, or a dark sidebar) or over the light page background
 * — `mix-blend-screen` glows on dark, but disappears on white, so light
 * areas use `mix-blend-multiply` with a different tint instead. Ignores
 * touch input.
 */
export function CursorGlow({ darkZoneRef }: { darkZoneRef: RefObject<HTMLElement | null> }) {
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const springX = useSpring(x, { damping: 26, stiffness: 200, mass: 0.4 });
  const springY = useSpring(y, { damping: 26, stiffness: 200, mass: 0.4 });
  const [onDark, setOnDark] = useState(true);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      const bounds = darkZoneRef.current?.getBoundingClientRect();
      const inside = bounds
        ? e.clientX >= bounds.left &&
          e.clientX <= bounds.right &&
          e.clientY >= bounds.top &&
          e.clientY <= bounds.bottom
        : true;
      setOnDark(inside);
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, [x, y, darkZoneRef]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[70] hidden h-[420px] w-[420px] rounded-full sm:block"
      style={{
        x: springX,
        y: springY,
        translateX: "-50%",
        translateY: "-50%",
        mixBlendMode: onDark ? "screen" : "multiply",
        background: onDark
          ? "radial-gradient(circle, rgba(103,232,249,0.4) 0%, rgba(103,232,249,0) 70%)"
          : "radial-gradient(circle, rgba(129,140,248,0.16) 0%, rgba(129,140,248,0) 70%)",
      }}
    />
  );
}
