"use client";

import { useRouter } from "next/navigation";
import { LandingPage } from "./LandingPage";
import { ScheduleApp } from "./ScheduleApp";

export function HomeClient({ documentationPhotos, showDashboard, scheduleDate }: { documentationPhotos: string[]; showDashboard: boolean; scheduleDate?: string }) {
  const router = useRouter();

  if (!showDashboard) {
    return <LandingPage photos={documentationPhotos} onEnter={() => router.push("/?view=dashboard")} />;
  }

  return <ScheduleApp initialScheduleDate={scheduleDate} onGoHome={() => router.push("/")} />;
}
