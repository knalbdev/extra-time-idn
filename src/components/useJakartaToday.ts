"use client";

import { useEffect, useState } from "react";
import { isoToday } from "@/lib/format";

export function useJakartaToday() {
  const [today, setToday] = useState(isoToday);
  useEffect(() => {
    const update = () => setToday(isoToday());
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return today;
}
