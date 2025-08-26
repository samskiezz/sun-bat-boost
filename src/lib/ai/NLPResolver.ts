import { type CatalogueProduct } from '@/utils/catalogClient';
import { compareTwoStrings } from 'string-similarity';

export interface ProductMatch {
  id: string;
  brand: string;
  model: string;
  type: 'panel' | 'inverter' | 'battery';
  confidence: number;
  power_rating?: number;
  capacity_kwh?: number;
}

export interface ProductEmbedding {
  id: string;
  text: string;
  embedding: number[];
  type: 'panel' | 'inverter' | 'battery';
  product: any;
}

class NLPResolver {
  private embeddings: ProductEmbedding[] = [];
  private isInitialized = false;

  async initialize(catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }) {
    if (this.isInitialized) return;

    console.log('[NLPResolver] Initializing product embeddings...');
    
    // Create text representations and simple embeddings for all products
    const allProducts = [
      ...catalog.panels.map(p => ({ ...p, type: 'panel' as const })),
      ...catalog.batteries.map(p => ({ ...p, type: 'battery' as const })),
      ...catalog.inverters.map(p => ({ ...p, type: 'inverter' as const }))
    ];

    for (const product of allProducts) {
      const text = this.createProductText(product);
      const embedding = this.createSimpleEmbedding(text);
      
      this.embeddings.push({
        id: product.id,
        text,
        embedding,
        type: product.type,
        product
      });
    }

    this.isInitialized = true;
    console.log(`[NLPResolver] Initialized ${this.embeddings.length} product embeddings`);
  }

  private createProductText(product: any): string {
    const parts = [
      product.brand,
      product.model,
      product.series,
      product.code,
      ...product.aliases || []
    ].filter(Boolean);

    // Add type-specific terms
    if (product.type === 'panel') {
      parts.push('solar panel', 'pv module', 'photovoltaic');
      if (product.specs?.watts) parts.push(`${product.specs.watts}W`, `${product.specs.watts} watts`);
    } else if (product.type === 'battery') {
      parts.push('battery', 'storage', 'energy storage');
      if (product.specs?.kWh) parts.push(`${product.specs.kWh}kWh`, `${product.specs.kWh} kwh`);
    } else if (product.type === 'inverter') {
      parts.push('inverter', 'string inverter', 'power inverter');
      if (product.power_rating) parts.push(`${product.power_rating}kW`, `${product.power_rating} kw`);
    }

    return parts.join(' ').toLowerCase();
  }

  private createSimpleEmbedding(text: string): number[] {
    // Simple TF-IDF-like embedding using character n-grams
    const words = text.split(/\s+/);
    const embedding: number[] = new Array(100).fill(0);
    
    // Hash words into embedding dimensions
    for (const word of words) {
      if (word.length < 2) continue;
      
      const hash1 = this.simpleHash(word) % 100;
      const hash2 = this.simpleHash(word.substring(0, 3)) % 100;
      const hash3 = this.simpleHash(word.substring(-3)) % 100;
      
      embedding[hash1] += 1.0;
      embedding[hash2] += 0.5;
      embedding[hash3] += 0.3;
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async fuzzyMatch(query: string, productType?: 'panel' | 'inverter' | 'battery'): Promise<ProductMatch | null> {
    if (!this.isInitialized) {
      console.warn('[NLPResolver] Not initialized, returning null');
      return null;
    }

    const queryText = query.toLowerCase().trim();
    const queryEmbedding = this.createSimpleEmbedding(queryText);
    
    let candidates = this.embeddings;
    if (productType) {
      candidates = candidates.filter(e => e.type === productType);
    }

    let bestMatch: { embedding: ProductEmbedding; score: number } | null = null;

    for (const embedding of candidates) {
      // Combine multiple similarity metrics
      const embeddingSimilarity = this.cosineSimilarity(queryEmbedding, embedding.embedding);
      const stringSimilarity = compareTwoStrings(queryText, embedding.text);
      const containsMatch = this.calculateContainmentScore(queryText, embedding.text);
      
      // Weighted combination
      const combinedScore = (
        embeddingSimilarity * 0.4 +
        stringSimilarity * 0.4 +
        containsMatch * 0.2
      );

      if (!bestMatch || combinedScore > bestMatch.score) {
        bestMatch = { embedding, score: combinedScore };
      }
    }

    // Return match if confidence is above threshold
    if (bestMatch && bestMatch.score >= 0.3) {
      const product = bestMatch.embedding.product;
      return {
        id: product.id,
        brand: product.brand,
        model: product.model,
        type: bestMatch.embedding.type,
        confidence: bestMatch.score,
        power_rating: product.specs?.watts,
        capacity_kwh: product.specs?.kWh
      };
    }

    return null;
  }

  private calculateContainmentScore(query: string, productText: string): number {
    const queryWords = new Set(query.split(/\s+/).filter(w => w.length > 2));
    const productWords = new Set(productText.split(/\s+/).filter(w => w.length > 2));
    
    let matches = 0;
    for (const queryWord of queryWords) {
      for (const productWord of productWords) {
        if (productWord.includes(queryWord) || queryWord.includes(productWord)) {
          matches++;
          break;
        }
      }
    }
    
    return queryWords.size > 0 ? matches / queryWords.size : 0;
  }

  // Multi-match for OCR text that may contain multiple products
  async fuzzyMatchMultiple(
    text: string, 
    productType?: 'panel' | 'inverter' | 'battery',
    maxResults = 3
  ): Promise<ProductMatch[]> {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const results: ProductMatch[] = [];
    const seenIds = new Set<string>();

    // Try to match each line
    for (const line of lines) {
      const match = await this.fuzzyMatch(line, productType);
      if (match && !seenIds.has(match.id)) {
        results.push(match);
        seenIds.add(match.id);
        
        if (results.length >= maxResults) break;
      }
    }

    // If no line matches found, try the full text
    if (results.length === 0) {
      const fullTextMatch = await this.fuzzyMatch(text, productType);
      if (fullTextMatch) {
        results.push(fullTextMatch);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }
}

// Singleton instance
const nlpResolver = new NLPResolver();

export async function fuzzyMatchProduct(
  query: string, 
  catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }, 
  productType?: 'panel' | 'inverter' | 'battery'
): Promise<ProductMatch | null> {
  await nlpResolver.initialize(catalog);
  return nlpResolver.fuzzyMatch(query, productType);
}

export async function fuzzyMatchMultipleProducts(
  text: string,
  catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] },
  productType?: 'panel' | 'inverter' | 'battery',
  maxResults = 3
): Promise<ProductMatch[]> {
  await nlpResolver.initialize(catalog);
  return nlpResolver.fuzzyMatchMultiple(text, productType, maxResults);
}