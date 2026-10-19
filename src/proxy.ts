import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  if (!url || !key) return response;
  let next = response;
  const supabase = createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, cacheHeaders) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        next = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => next.cookies.set(name, value, options));
        Object.entries(cacheHeaders ?? {}).forEach(([name, value]) => next.headers.set(name, value));
        next.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  // Auth outages must never result in a fabricated signed-in user.
  try { await supabase.auth.getClaims(); } catch { /* The page verifies the user again and fails closed. */ }
  return next;
}
export const config = { matcher: ["/", "/coach/:path*", "/pendamping/:path*"] };
