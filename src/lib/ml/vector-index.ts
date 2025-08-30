// Vector Index Operations

import { supabase } from '@/integrations/supabase/client';
import type { VectorEmbedding, MatchCandidate } from '@/types/geo';

export async function vectIndexUpsert(
  id: string,
  kind: string,
  embedding: VectorEmbedding,
  meta: Record<string, any> = {}
): Promise<void> {
  // Convert embedding to base64 encoded string
  const buffer = new ArrayBuffer(embedding.values.length * 4);
  const view = new Float32Array(buffer);
  embedding.values.forEach((val, i) => {
    view[i] = val;
  });
  
  // Convert to base64 string for storage
  const uint8Array = new Uint8Array(buffer);
  const base64String = btoa(String.fromCharCode(...uint8Array));
  
  const { error } = await supabase
    .from('ml_vectors')
    .upsert({
      id,
      kind,
      dim: embedding.dimensions,
      embedding_format: embedding.format,
      embedding: base64String,
      meta: {
        ...meta,
        timestamp: new Date().toISOString()
      }
    });
  
  if (error) {
    console.error('Failed to upsert vector:', error);
    throw new Error(`Vector upsert failed: ${error.message}`);
  }
}

export async function vectIndexSearch(
  embedding: VectorEmbedding,
  k: number = 10,
  filters?: { kind?: string; meta?: Record<string, any> }
): Promise<MatchCandidate[]> {
  try {
    // For now, use the edge function for vector search
    const { data, error } = await supabase.functions.invoke('ml-poly-match', {
      body: {
        embedding: embedding.values,
        k,
        kind: filters?.kind,
        filters: filters?.meta
      }
    });
    
    if (error) {
      console.error('Vector search error:', error);
      // Fallback to simple query without vector similarity
      return await fallbackSearch(filters?.kind || '', k);
    }
    
    return data?.matches || [];
  } catch (error) {
    console.error('Vector search failed:', error);
    return await fallbackSearch(filters?.kind || '', k);
  }
}

export async function vectIndexDelete(id: string): Promise<void> {
  const { error } = await supabase
    .from('ml_vectors')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Failed to delete vector:', error);
    throw new Error(`Vector delete failed: ${error.message}`);
  }
}

export async function batchUpsertVectors(
  items: Array<{
    id: string;
    kind: string;
    embedding: VectorEmbedding;
    meta: Record<string, any>;
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  // Process in batches of 10
  const batchSize = 10;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const promises = batch.map(async (item) => {
      try {
        await vectIndexUpsert(item.id, item.kind, item.embedding, item.meta);
        return true;
      } catch (error) {
        console.error(`Failed to upsert vector ${item.id}:`, error);
        return false;
      }
    });
    
    const results = await Promise.all(promises);
    success += results.filter(Boolean).length;
    failed += results.filter(r => !r).length;
  }
  
  return { success, failed };
}

// Fallback search without vector similarity
async function fallbackSearch(kind: string, k: number): Promise<MatchCandidate[]> {
  const query = supabase
    .from('ml_vectors')
    .select('id, kind, embedding_format, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(k);
  
  if (kind) {
    query.eq('kind', kind);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Fallback search error:', error);
    return [];
  }
  
  return (data || []).map(record => ({
    id: record.id,
    kind: record.kind,
    embedding: {
      dimensions: 64,
      values: Array(64).fill(0),
      format: record.embedding_format as 'f32'
    },
    meta: (record.meta as Record<string, any>) || {},
    score: Math.random() * 0.5 + 0.5 // Random relevance score
  }));
}

// Utility function to calculate cosine similarity
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Get vector index statistics
export async function getIndexStats(): Promise<{
  total_vectors: number;
  by_kind: Record<string, number>;
  avg_dimension: number;
}> {
  const { data, error } = await supabase
    .from('ml_vectors')
    .select('kind, dim');
  
  if (error || !data) {
    return { total_vectors: 0, by_kind: {}, avg_dimension: 0 };
  }
  
  const byKind: Record<string, number> = {};
  let totalDim = 0;
  
  for (const record of data) {
    byKind[record.kind] = (byKind[record.kind] || 0) + 1;
    totalDim += record.dim;
  }
  
  return {
    total_vectors: data.length,
    by_kind: byKind,
    avg_dimension: data.length > 0 ? totalDim / data.length : 0
  };
}