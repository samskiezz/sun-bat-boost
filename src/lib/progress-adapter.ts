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
 */
export function adaptStatus(input: any): StatusPayload {
  const rows: ProgressRow[] = [];

  const src = Array.isArray(input?.progress) ? input.progress : [];
  for (const r of src) {
    const category: Cat = (r.category || r.cat) as Cat;
    if (!category) continue;

    const target =
      num(r.target) ?? num(r.total_found) ?? num(r.found) ?? 0;

    const processed =
      num(r.processed) ?? num(r.total_processed) ?? num(r.count_processed) ?? 0;

    const specs_done =
      num(r.specs_done) ?? num(r.total_parsed) ?? num(r.specs) ?? 0;

    const pdf_done =
      num(r.pdf_done) ?? num(r.total_with_pdfs) ?? num(r.pdfs) ?? 0;

    const state: any = r.state || r.status || 'processing';

    rows.push({ category, target, processed, specs_done, pdf_done, state });
  }

  // ensure we always show all three categories even if edge forgot to init
  const want: Cat[] = ['PANEL','BATTERY_MODULE','INVERTER'];
  for (const c of want) {
    if (!rows.find(x => x.category === c)) {
      rows.push({ category: c, target: 0, processed: 0, specs_done: 0, pdf_done: 0, state: 'pending' });
    }
  }

  return {
    job: input?.job ? { id: input.job.id, status: input.job.status } : undefined,
    progress: rows.sort((a,b)=> a.category.localeCompare(b.category))
  };
}

function num(v: any): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}