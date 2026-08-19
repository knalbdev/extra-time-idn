import { NextResponse } from "next/server";
import { getAllEvents } from "@/lib/sheets";
import { ScheduleResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await getAllEvents();
    const payload: ScheduleResponse = {
      events,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat data jadwal.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
