import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { TITLES } from "@/data/titles";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import type { OrderType, Title } from "@/lib/types";

/** Loads the catalog from Supabase (server-side); falls back to the bundled seed data. */
export const getTitles = cache(async (): Promise<Title[]> => {
  if (!isSupabaseConfigured) return TITLES;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.from("titles").select("*").order("story_order_index");
    if (error || !data || data.length === 0) return TITLES;
    return data as Title[];
  } catch {
    return TITLES;
  }
});

export function sortTitles(titles: Title[], order: OrderType): Title[] {
  return [...titles].sort((a, b) =>
    order === "story"
      ? a.story_order_index - b.story_order_index
      : a.release_date.localeCompare(b.release_date) || a.story_order_index - b.story_order_index,
  );
}
