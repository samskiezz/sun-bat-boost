import { supabase } from "@/integrations/supabase/client";

export async function getLinks() {
  const { data, error } = await supabase
    .from("links")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
    
  if (error) {
    console.warn("Failed to fetch links:", error);
    return [];
  }
  
  return data || [];
}