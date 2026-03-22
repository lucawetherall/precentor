"use server";

import { createClient } from "@/lib/supabase/server";
import { syncCurrentYear } from "@/lib/lectionary/mapper";

const VALID_VERSIONS = ["NRSVAE", "NRSV", "AV", "BCP", "CW"];

interface SyncResult {
  success: boolean;
  imported?: number;
  errors?: number;
  total?: number;
  lectionaryYear?: string;
  churchYear?: string;
  error?: string;
}

export async function syncLectionaryAction(
  fetchText: boolean,
  version: string,
): Promise<SyncResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const bibleVersion = VALID_VERSIONS.includes(version) ? version : undefined;
    const result = await syncCurrentYear({ fetchText, bibleVersion });

    return {
      success: result.imported > 0 || result.errors === 0,
      imported: result.imported,
      errors: result.errors,
      total: result.total,
      lectionaryYear: result.lectionaryYear,
      churchYear: result.churchYear,
    };
  } catch (err) {
    return {
      success: false,
      error: `Sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
