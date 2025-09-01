import { suggestLinks, findGaps, detectConflicts, summarizeActions } from "@/services/datapoly-actions";

export async function POST(request: Request) {
  try {
    const { hulls, items, previousHulls, existingLinks } = await request.json();
    const links = suggestLinks(hulls);
    const gaps = findGaps(items || [], hulls);
    const conflicts = detectConflicts(existingLinks || [], hulls, previousHulls || {});
    const summary = summarizeActions(links, gaps, conflicts);
    
    return new Response(JSON.stringify(summary), { 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { 
      status: 500,
      headers: { "Content-Type": "application/json" } 
    });
  }
}