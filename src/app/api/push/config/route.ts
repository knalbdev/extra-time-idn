import { pushConfig } from "@/lib/push-server";

export const runtime = "nodejs";
export async function GET() {
  const config = pushConfig();
  return Response.json({ enabled: Boolean(config), publicKey: config?.publicKey ?? null }, { headers: { "Cache-Control": "no-store" } });
}
