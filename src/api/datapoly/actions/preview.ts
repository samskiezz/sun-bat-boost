export async function POST({ request }: any) {
  const { hulls, items, previousHulls, existingLinks } = await request.json();
  const { suggestLinks, findGaps, detectConflicts, summarizeActions } = await import("@/services/datapoly-actions");
  const links = suggestLinks(hulls);
  const gaps = findGaps(items || [], hulls);
  const conflicts = detectConflicts(existingLinks || [], hulls, previousHulls || {});
  return new Response(JSON.stringify(summarizeActions(links, gaps, conflicts)), { headers: { "Content-Type": "application/json" } });
}