// smartMatcher.ts — self-learning product matcher
// Works local-only OR with Supabase (flip USE_SUPABASE)

export type ProdType = "panel"|"inverter"|"battery";

export interface Product {
  id: string;
  type: ProdType;
  brand: string;         // canonical: GOODWE, EGING, TESLA, etc.
  model: string;         // canonical: GW6000-EH, EG-440NT54-HL/BF-DG, LX F12.8-H-20
  regex?: string;        // precise pattern for first-pass
  aliases?: string[];    // grows as we learn
  specs?: Record<string, any>;
  power_rating?: number;
  capacity_kwh?: number;
}

export interface MatchHit {
  productId: string;
  product: Product;
  score: number;         // 0..1
  evidence: {
    sectionBoost: number;
    qtyBoost: number;
    brandNearby: boolean;
    specNearby: boolean;
    regexHit: boolean;
    aliasHit: boolean;
    ocrRiskPenalty: number;
  };
  at: number;            // char index in normalized text
  raw: string;
}

const USE_SUPABASE = false; // set true if you wire it
const BRAND_THRESH_DEFAULT = 0.75; // fallback auto-accept threshold

// --- persistence (swap with Supabase) ---
const store = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  },
  async set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

type Weights = {
  regex: number; alias: number; section: number; qty: number; brand: number; spec: number; ocrPenalty: number;
}
type BrandThresholds = Record<string, number>;
type AliasMap = Record<string, string[]>; // productId -> aliases[]
type RegexMap = Record<string, string>;   // productId -> regex

const DEFAULT_WEIGHTS: Weights = { regex: 0.45, alias: 0.30, section: 0.20, qty: 0.15, brand: 0.10, spec: 0.10, ocrPenalty: 0.15 };

async function loadWeights(): Promise<Weights> {
  return store.get<Weights>("mm.weights", DEFAULT_WEIGHTS);
}
async function saveWeights(w: Weights){ await store.set("mm.weights", w); }

async function loadBrandThresholds(): Promise<BrandThresholds> {
  return store.get<BrandThresholds>("mm.brandThresholds", {});
}
async function saveBrandThresholds(t: BrandThresholds){ await store.set("mm.brandThresholds", t); }

async function loadAliases(): Promise<AliasMap> { return store.get<AliasMap>("mm.aliases", {}); }
async function saveAliases(a: AliasMap){ await store.set("mm.aliases", a); }

async function loadRegexes(): Promise<RegexMap> { return store.get<RegexMap>("mm.regexes", {}); }
async function saveRegexes(r: RegexMap){ await store.set("mm.regexes", r); }

// --- utils ---
const ANCHORS = [/YOUR SOLUTION/i, /QUOTATION/i, /SYSTEM COMPONENTS/i, /INCLUSIONS/i, /EQUIPMENT/i];
const UNIT_NEAR = {
  panel: /\b(\d{3,4})\s*W\b/i,
  inverter: /\b(\d(\.\d)?)\s*KW\b/i,
  battery: /\b(\d{1,2}(\.\d)?)\s*KWH\b/i
};

function normalizeText(s: string){
  let t = s.toUpperCase().replace(/\r/g,"");
  t = t.replace(/(\w)-\n(\w)/g, "$1$2");          // unwrap hyphen line breaks
  t = t.replace(/[–—−]/g, "-");                   // unify dashes
  t = t.replace(/\s+/g, " ");
  return t;
}

function sectionBoost(text: string, idx: number){
  for (const a of ANCHORS){
    const m = a.exec(text);
    if (m && idx > m.index && (idx - m.index) < 1500) return 0.25;
  }
  return 0;
}

function windowAround(text: string, idx: number, span = 120){
  const start = Math.max(0, idx - span), end = Math.min(text.length, idx + span);
  return text.slice(start, end);
}

function brandNearby(win: string, brand: string){
  return new RegExp(`\\b${brand}\\b`, "i").test(win);
}

function specNearby(win: string, type: ProdType){
  return UNIT_NEAR[type].test(win);
}

function qtyBoost(win: string){ return /\b(\d+\s*[X×]\s*)?[A-Z0-9]/.test(win) ? 0.20 : 0; }

function ocrRiskPenalty(raw: string){
  // penalize if contains many ambiguous chars (O/0, I/1) mixed with hyphens
  const amb = (raw.match(/[O0I1]/g) || []).length;
  const hy = (raw.match(/[-/]/g) || []).length;
  return Math.min(0.25, (amb * 0.02) + (hy > 5 ? 0.05 : 0));
}

function aliasToLooseRegex(alias: string){
  // Turn "EG 440NT54 HL BF DG" into a tolerant pattern
  const esc = alias.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return `\\b${esc.replace(/\s+/g, "[-/\\s]?")}\\b`;
}

// Built-in fuzzer for generating alias variants
export function fuzzAliases(model: string): string[] {
  const s = model.toUpperCase();
  const swaps: [RegExp,string][] = [
    [/[\s-]+/g, " "],
    [/O/g, "0"], [/0/g, "O"],
    [/I/g, "1"], [/1/g, "I"],
    [/\/|\-/g, " "]
  ];
  const out = new Set<string>([s]);
  for (const [re, rep] of swaps){
    out.add(s.replace(re, rep));
  }
  return [...out];
}

export class SmartMatcher {
  private weights!: Weights;
  private aliases!: AliasMap;
  private regexes!: RegexMap;
  private brandThresholds!: BrandThresholds;
  private products: Product[];

  constructor(products: Product[]){
    this.products = products;
  }

  async init(){
    [this.weights, this.aliases, this.regexes, this.brandThresholds] = await Promise.all([
      loadWeights(), loadAliases(), loadRegexes(), loadBrandThresholds()
    ]);
    console.log('🧠 SmartMatcher initialized with', this.products.length, 'products');
    console.log('📊 Current weights:', this.weights);
    console.log('🎯 Brand thresholds:', this.brandThresholds);
  }

  match(textRaw: string): MatchHit[] {
    const T = normalizeText(textRaw);
    const hits: MatchHit[] = [];

    for (const p of this.products){
      // resolve learned regex/aliases
      const learnedRegex = this.regexes[p.id];
      const learnedAliases = this.aliases[p.id] || [];
      const regexList: string[] = [];
      if (p.regex) regexList.push(p.regex);
      if (learnedRegex) regexList.push(learnedRegex);

      let best: MatchHit | null = null;

      // 1) regex pass
      for (const r of regexList){
        const re = new RegExp(r, "gi");
        let m;
        while ((m = re.exec(T)) !== null) {
          const at = m.index, raw = m[0];
          const win = windowAround(T, at);
          const ev = {
            regexHit: true,
            aliasHit: false,
            sectionBoost: sectionBoost(T, at),
            qtyBoost: qtyBoost(win),
            brandNearby: brandNearby(win, p.brand),
            specNearby: specNearby(win, p.type),
            ocrRiskPenalty: ocrRiskPenalty(raw)
          };
          const score = this.score(ev);
          if (!best || score > best.score) {
            best = { productId: p.id, product: p, score, evidence: ev, at, raw };
          }
        }
      }

      // 2) alias pass (includes canonical aliases + learned)
      if (!best){
        const aliasPool = [...(p.aliases || []), ...learnedAliases];
        for (const a of aliasPool){
          const re = new RegExp(aliasToLooseRegex(a), "gi");
          let m;
          while ((m = re.exec(T)) !== null) {
            const at = m.index, raw = m[0];
            const win = windowAround(T, at);
            const ev = {
              regexHit: false,
              aliasHit: true,
              sectionBoost: sectionBoost(T, at),
              qtyBoost: qtyBoost(win),
              brandNearby: brandNearby(win, p.brand),
              specNearby: specNearby(win, p.type),
              ocrRiskPenalty: ocrRiskPenalty(raw)
            };
            const score = this.score(ev);
            if (!best || score > best.score) best = { productId: p.id, product: p, score, evidence: ev, at, raw };
          }
        }
      }

      if (best) hits.push(best);
    }

    // sort by score desc, deduplicate by productId
    const deduped = new Map<string, MatchHit>();
    for (const hit of hits.sort((a,b)=> b.score - a.score)) {
      if (!deduped.has(hit.productId) || deduped.get(hit.productId)!.score < hit.score) {
        deduped.set(hit.productId, hit);
      }
    }

    return Array.from(deduped.values()).sort((a,b)=> b.score - a.score);
  }

  private score(ev: MatchHit["evidence"]){
    const w = this.weights;
    // logistic-like squashing via min/max after weighted sum
    const s =
      (ev.regexHit ? w.regex : 0) +
      (ev.aliasHit ? w.alias : 0) +
      (ev.sectionBoost * w.section) +
      (ev.qtyBoost * w.qty) +
      (ev.brandNearby ? w.brand : 0) +
      (ev.specNearby ? w.spec : 0) -
      (ev.ocrRiskPenalty * w.ocrPenalty);

    return Math.max(0, Math.min(1, s));
  }

  // --- Online learning APIs ---

  /** call when user CONFIRMS the top candidate (true positive) */
  async learnConfirm(hit: MatchHit, seenRawToken: string){
    console.log('✅ Learning from confirmation:', hit.product.brand, hit.product.model);
    
    // 1) add alias if new
    const pid = hit.productId;
    const aliasList = this.aliases[pid] || [];
    const aliNorm = seenRawToken.toUpperCase().trim().replace(/\s+/g," ");
    if (!aliasList.includes(aliNorm)){
      aliasList.push(aliNorm);
      this.aliases[pid] = aliasList;
      await saveAliases(this.aliases);
      console.log('📝 Added new alias:', aliNorm);
    }
    
    // 2) auto-generate a safer regex and save (pattern miner)
    const rx = this.generateRegexFromModel(aliNorm);
    this.regexes[pid] = rx;
    await saveRegexes(this.regexes);
    console.log('🔍 Generated regex:', rx);

    // 3) generate fuzzed aliases to improve future matching
    const fuzzed = fuzzAliases(aliNorm);
    for (const f of fuzzed) {
      if (!aliasList.includes(f)) {
        aliasList.push(f);
      }
    }
    this.aliases[pid] = aliasList;
    await saveAliases(this.aliases);

    // 4) nudge weights (Passive-Aggressive style)
    await this.updateWeights(true, hit.evidence);

    // 5) adapt brand threshold
    const brand = hit.product.brand;
    const bt = this.brandThresholds[brand] ?? BRAND_THRESH_DEFAULT;
    // if accepted with high score, we can ease threshold slightly (never below 0.65)
    const newBt = Math.max(0.65, bt - 0.01);
    this.brandThresholds[brand] = newBt;
    await saveBrandThresholds(this.brandThresholds);
    console.log(`🎯 Adjusted ${brand} threshold: ${bt.toFixed(3)} → ${newBt.toFixed(3)}`);
  }

  /** call when user CORRECTS (picked a different product) */
  async learnCorrection(falseHit: MatchHit, trueProduct: Product, seenRawToken: string){
    console.log('❌ Learning from correction:', falseHit.product.brand, '→', trueProduct.brand);
    
    // penalize thresholds for that brand slightly
    const brand = falseHit.product.brand;
    const bt = this.brandThresholds[brand] ?? BRAND_THRESH_DEFAULT;
    const newBt = Math.min(0.90, bt + 0.02);
    this.brandThresholds[brand] = newBt;
    await saveBrandThresholds(this.brandThresholds);
    console.log(`⚠️  Tightened ${brand} threshold: ${bt.toFixed(3)} → ${newBt.toFixed(3)}`);

    // add alias to the TRUE product + regex from token
    const pid = trueProduct.id;
    const aliasList = this.aliases[pid] || [];
    const aliNorm = seenRawToken.toUpperCase().trim().replace(/\s+/g," ");
    if (!aliasList.includes(aliNorm)){
      aliasList.push(aliNorm);
      this.aliases[pid] = aliasList;
      await saveAliases(this.aliases);
    }
    const rx = this.generateRegexFromModel(aliNorm);
    this.regexes[pid] = rx;
    await saveRegexes(this.regexes);

    // update weights with a negative for the false evidence
    await this.updateWeights(false, falseHit.evidence);
  }

  /** brand-specific auto-accept threshold */
  async autoAcceptThreshold(brand: string){
    const t = await loadBrandThresholds();
    return t[brand] ?? BRAND_THRESH_DEFAULT;
  }

  private async updateWeights(isPositive: boolean, ev: MatchHit["evidence"]){
    const w = await loadWeights();
    const lr = 0.08; // learning rate — small
    const delta = (k: keyof Weights, v: number) => {
      w[k] += (isPositive ? +lr : -lr) * v;
    };
    // Update toward features that led to the (correct/incorrect) decision
    delta("regex", ev.regexHit ? 1 : 0);
    delta("alias", ev.aliasHit ? 1 : 0);
    delta("section", ev.sectionBoost);
    delta("qty", ev.qtyBoost);
    delta("brand", ev.brandNearby ? 1 : 0);
    delta("spec", ev.specNearby ? 1 : 0);
    delta("ocrPenalty", ev.ocrRiskPenalty);
    // clamp weights
    for (const k of Object.keys(w) as (keyof Weights)[]){
      w[k] = Math.max(0.01, Math.min(0.8, w[k]));
    }
    await saveWeights(w);
    this.weights = w;
    console.log('🔄 Updated weights:', this.weights);
  }

  /** turns a confirmed token into a safer regex (digits/gaps tolerant) */
  private generateRegexFromModel(token: string){
    // EG-440NT54-HL/BF-DG  ->  \bEG[-\s]?440NT54[-\s]?HL(?:[-/\s]?BF)?[-\s]?DG\b
    let t = token
      .replace(/\s+/g, " ")
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape

    // make separators optional and tolerant
    t = t.replace(/\s+/g, "[-/\\s]?");
    // tighten: merge multiple ? to single
    t = t.replace(/\?\?+/g, "?");

    return `\\b${t}\\b`;
  }

  // Debug helper
  getStats() {
    return {
      weights: this.weights,
      aliases: Object.keys(this.aliases).length,
      regexes: Object.keys(this.regexes).length,
      brandThresholds: this.brandThresholds,
      products: this.products.length
    };
  }
}