import { readEnabledExtracurriculars } from "@/lib/extracurricular-settings";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json({ enabled: await readEnabledExtracurriculars() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Daftar ekstrakurikuler belum dapat dimuat. Silakan coba kembali." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
