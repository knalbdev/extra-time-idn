"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";
import { Icon } from "./Icon";

export function StatCard({
  label,
  value,
  hint,
  iconBg,
  iconColor,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  iconBg: string;
  iconColor: string;
  icon: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "0 8px 20px -6px rgba(3,34,77,0.18)" }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="card flex items-center justify-between rounded-xl p-5"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-on-surface-variant">{label}</p>
        <p className="mt-1 font-heading text-3xl font-bold tracking-tight text-on-surface">
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-on-surface-variant/80">{hint}</p>}
      </div>
      <motion.div
        whileHover={{ rotate: 8, scale: 1.08 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
      >
        <Icon name={icon} className="text-2xl" />
      </motion.div>
    </motion.div>
  );
}
