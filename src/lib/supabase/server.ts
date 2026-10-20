import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SECRET_KEY);
}
export async function sessionClient() {
  if (!hasSupabaseConfig()) throw new Error("Konfigurasi Supabase belum lengkap di server.");
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => {
        // Server Components cannot write cookies. Proxy refreshes them instead.
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* read-only render */ }
      },
    },
  });
}
// Username resolution, Auth provisioning, and companion submission/idempotency
// checks and service-only Web Push RPCs may use this client. Companion actors,
// push device ownership, and scheduler authorization are verified first.
// Student/meeting/assessment requests must use sessionClient + RLS.
export function adminClient() {
  if (!hasSupabaseConfig()) throw new Error("Konfigurasi Supabase belum lengkap di server.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}
