"use client";

import { useRouter } from "next/navigation";
import { LandingPage } from "./LandingPage";
import { ScheduleApp } from "./ScheduleApp";

export function HomeClient({ documentationPhotos, showDashboard }: { documentationPhotos: string[]; showDashboard: boolean }) {
  const router = useRouter();

  if (!showDashboard) {
    return <LandingPage photos={documentationPhotos} onEnter={() => router.push("/?view=dashboard")} />;
  }

  return <ScheduleApp onGoHome={() => router.push("/")} />;
}
