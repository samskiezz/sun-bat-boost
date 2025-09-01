import { supabase } from "@/integrations/supabase/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const links = body?.createLinks || [];

    console.log("📝 Applying links:", links);

    if (links.length) {
      const rows = links.map((l: any) => ({ 
        source_a: l.from, 
        source_b: l.to, 
        score: l.score, 
        reason: l.reason 
      }));
      
      const { error } = await supabase.from("links").insert(rows);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true, applied: links.length }), { 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error: any) {
    console.error("❌ Apply error:", error);
    return new Response(JSON.stringify({ error: String(error?.message || error) }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}