// Shape adapter (normalises any backend shape)
export type Cat = 'PANEL' | 'BATTERY_MODULE' | 'INVERTER';
export interface ProgressRow {
  category: Cat;
  target: number;
  processed: number;
  specs_done: number;
  pdf_done: number;
  state: 'pending'|'processing'|'completed'|'failed';
}

export interface StatusPayload {
  job?: { id: string; status: string };
  progress: ProgressRow[];
}

/**
 * Accepts:
 *  - { job, progress: [{category, target, processed, specs_done, pdf_done, state}] }
 *  - { job, progress: [{category, total_found, total_processed, total_with_pdfs, total_parsed, status}] }
 *  - { job, progress: [{cat:'PANEL', found:1348, processed:615, specs:400, pdfs:380, state:'running'}]}
 *  - { job, progress: [...], productCounts: [{category, total_count, with_pdf_count, with_datasheet_count}] }
 */
export function adaptStatus(input: any): StatusPayload {
  console.log('🔍 adaptStatus input:', input);
  const rows: ProgressRow[] = [];

  const src = Array.isArray(input?.progress) ? input.progress : [];
  const productCounts = Array.isArray(input?.productCounts) ? input.productCounts : [];
  
  console.log('📊 adaptStatus processing:', { progressCount: src.length, productCountsCount: productCounts.length });
  
  // Create a map of productCounts by category for easy lookup
  const productCountsMap = new Map();
  for (const pc of productCounts) {
    productCountsMap.set(pc.category, pc);
  }

  for (const r of src) {
    const category: Cat = (r.category || r.cat) as Cat;
    if (!category) continue;

    let target = num(r.target) ?? num(r.total_found) ?? num(r.found) ?? 0;
    let processed = num(r.processed) ?? num(r.total_processed) ?? num(r.count_processed) ?? 0;
    let specs_done = num(r.specs_done) ?? num(r.total_parsed) ?? num(r.specs) ?? 0;
    let pdf_done = num(r.pdf_done) ?? num(r.total_with_pdfs) ?? num(r.pdfs) ?? 0;

    // If progress shows 0s but we have productCounts data, use that instead
    const productCount = productCountsMap.get(category);
    if (productCount && processed === 0 && specs_done === 0 && pdf_done === 0) {
      console.log(`🔄 Using productCount for ${category}:`, productCount);
      processed = num(productCount.total_count) ?? 0;
      specs_done = num(productCount.with_datasheet_count) ?? 0;
      pdf_done = num(productCount.with_pdf_count) ?? 0;
      
      // Set target to the expected totals from readiness gates
      if (category === 'PANEL') target = 1348;
      else if (category === 'BATTERY_MODULE') target = 513;
      else if (category === 'INVERTER') target = 200;
    }

    const state: any = r.state || r.status || 'processing';

    console.log(`📈 Final row for ${category}:`, { target, processed, specs_done, pdf_done, state });
    rows.push({ category, target, processed, specs_done, pdf_done, state });
  }

  // ensure we always show all three categories even if edge forgot to init
  const want: Cat[] = ['PANEL','BATTERY_MODULE','INVERTER'];
  for (const c of want) {
    if (!rows.find(x => x.category === c)) {
      // Check if we have productCount data for missing categories
      const productCount = productCountsMap.get(c);
      let target = 0, processed = 0, specs_done = 0, pdf_done = 0;
      
      if (productCount) {
        processed = num(productCount.total_count) ?? 0;
        specs_done = num(productCount.with_datasheet_count) ?? 0;
        pdf_done = num(productCount.with_pdf_count) ?? 0;
        
        if (c === 'PANEL') target = 1348;
        else if (c === 'BATTERY_MODULE') target = 513;
        else if (c === 'INVERTER') target = 200;
      }
      
      rows.push({ category: c, target, processed, specs_done, pdf_done, state: 'pending' });
    }
  }

  const result = {
    job: input?.job ? { id: input.job.id, status: input.job.status } : undefined,
    progress: rows.sort((a,b)=> a.category.localeCompare(b.category))
  };
  
  console.log('✅ adaptStatus result:', result);
  return result;
}

function num(v: any): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}