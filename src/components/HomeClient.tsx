"use client";

import { useState } from "react";
import { LandingPage } from "./LandingPage";
import { ScheduleApp } from "./ScheduleApp";

export function HomeClient({ documentationPhotos }: { documentationPhotos: string[] }) {
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return <LandingPage photos={documentationPhotos} onEnter={() => setEntered(true)} />;
  }

  return <ScheduleApp onGoHome={() => setEntered(false)} />;
}
