import "server-only";
import { cache } from "react";
import { ESKUL_ORDER } from "./constants";
import { hasSupabaseConfig, sessionClient } from "./supabase/server";

export const readEnabledExtracurriculars = cache(async () => {
  if (!hasSupabaseConfig()) return ESKUL_ORDER.filter(key => key !== "pramuka");
  const client = await sessionClient();
  const { data, error } = await client.rpc("get_enabled_extracurriculars").abortSignal(AbortSignal.timeout(10000));
  if (error || !Array.isArray(data)) throw new Error("Daftar ekstrakurikuler belum dapat dimuat.");
  return ESKUL_ORDER.filter(key => data.includes(key));
});
