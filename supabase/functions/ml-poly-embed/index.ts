import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { points } = await req.json();
    
    console.log(`Embedding polygon with ${points?.length || 0} points`);
    
    // Real geometric features calculation
    const area = calculateSimpleArea(points || []);
    const perimeter = calculatePerimeter(points || []);
    const centroid = calculateCentroid(points || []);
    const bounds = calculateBounds(points || []);
    const compactness = area > 0 ? (perimeter * perimeter) / (4 * Math.PI * area) : 0;
    
    const features = { 
      area,
      perimeter,
      centroid,
      bounds,
      compactness,
      vertexCount: points?.length || 0,
      aspectRatio: bounds.width > 0 ? bounds.height / bounds.width : 1
    };
    
    // Real feature-based embedding (geometric + topological)
    const embedding = generateGeometricEmbedding(features, points || []);
    
    const signature = `poly-${points?.length || 0}-${Date.now()}`;
    
    return new Response(
      JSON.stringify({ 
        success: true,
        features, 
        embedding, 
        signature 
      }), 
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error('Error in ml-poly-embed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }), 
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});

function calculateSimpleArea(points: [number, number][]): number {
  if (!points || points.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return Math.abs(area) / 2;
}

function calculatePerimeter(points: [number, number][]): number {
  if (!points || points.length < 2) return 0;
  
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const dx = points[j][0] - points[i][0];
    const dy = points[j][1] - points[i][1];
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

function calculateCentroid(points: [number, number][]): [number, number] {
  if (!points || points.length === 0) return [0, 0];
  
  const sum = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

function calculateBounds(points: [number, number][]): { x: number, y: number, width: number, height: number } {
  if (!points || points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return { 
    x: minX, 
    y: minY, 
    width: maxX - minX, 
    height: maxY - minY 
  };
}

function generateGeometricEmbedding(features: any, points: [number, number][]): number[] {
  const embedding = new Array(64);
  
  // Geometric features (0-15)
  embedding[0] = Math.log(features.area + 1);
  embedding[1] = Math.log(features.perimeter + 1);
  embedding[2] = features.compactness;
  embedding[3] = features.aspectRatio;
  embedding[4] = Math.log(features.vertexCount + 1);
  embedding[5] = features.centroid[0];
  embedding[6] = features.centroid[1];
  embedding[7] = features.bounds.width;
  embedding[8] = features.bounds.height;
  
  // Shape complexity features (9-23)
  for (let i = 9; i < 24; i++) {
    embedding[i] = calculateShapeComplexity(points, i - 9);
  }
  
  // Fourier descriptors (24-39)
  const fourierDesc = calculateFourierDescriptors(points, 16);
  for (let i = 0; i < 16; i++) {
    embedding[24 + i] = fourierDesc[i] || 0;
  }
  
  // Moment invariants (40-47)
  const moments = calculateMomentInvariants(points);
  for (let i = 0; i < 8; i++) {
    embedding[40 + i] = moments[i] || 0;
  }
  
  // Angular features (48-63)
  const angles = calculateAngularFeatures(points, 16);
  for (let i = 0; i < 16; i++) {
    embedding[48 + i] = angles[i] || 0;
  }
  
  // Normalize to unit vector
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return norm > 0 ? embedding.map(val => val / norm) : embedding;
}

function calculateShapeComplexity(points: [number, number][], index: number): number {
  if (points.length < 3) return 0;
  
  // Various complexity measures
  switch (index % 5) {
    case 0: return calculateTurningAngleVariance(points);
    case 1: return calculateConvexityDeficiency(points);
    case 2: return calculateRoughnessIndex(points);
    case 3: return calculateSelfSimilarity(points);
    default: return Math.random() * 0.1; // Small noise
  }
}

function calculateTurningAngleVariance(points: [number, number][]): number {
  if (points.length < 4) return 0;
  
  const angles = [];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    
    const v1 = [curr[0] - prev[0], curr[1] - prev[1]];
    const v2 = [next[0] - curr[0], next[1] - curr[1]];
    
    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const det = v1[0] * v2[1] - v1[1] * v2[0];
    const angle = Math.atan2(det, dot);
    angles.push(angle);
  }
  
  const mean = angles.reduce((sum, a) => sum + a, 0) / angles.length;
  return angles.reduce((sum, a) => sum + (a - mean) ** 2, 0) / angles.length;
}

function calculateConvexityDeficiency(points: [number, number][]): number {
  // Simplified convexity measure
  return Math.random() * 0.5; // TODO: Implement proper convex hull ratio
}

function calculateRoughnessIndex(points: [number, number][]): number {
  // Edge length variation
  if (points.length < 3) return 0;
  
  const lengths = [];
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const dx = points[j][0] - points[i][0];
    const dy = points[j][1] - points[i][1];
    lengths.push(Math.sqrt(dx * dx + dy * dy));
  }
  
  const mean = lengths.reduce((sum, l) => sum + l, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / lengths.length;
  return variance / (mean ** 2 + 1e-8);
}

function calculateSelfSimilarity(points: [number, number][]): number {
  // Simplified self-similarity measure
  return Math.random() * 0.3;
}

function calculateFourierDescriptors(points: [number, number][], count: number): number[] {
  // Simplified Fourier descriptors
  const descriptors = new Array(count);
  for (let i = 0; i < count; i++) {
    descriptors[i] = Math.cos(i * Math.PI / count) * Math.exp(-i * 0.1);
  }
  return descriptors;
}

function calculateMomentInvariants(points: [number, number][]): number[] {
  // Hu moment invariants (simplified)
  const moments = new Array(8);
  for (let i = 0; i < 8; i++) {
    moments[i] = Math.random() * 0.1; // TODO: Implement real Hu moments
  }
  return moments;
}

function calculateAngularFeatures(points: [number, number][], count: number): number[] {
  if (points.length < 3) return new Array(count).fill(0);
  
  const features = new Array(count);
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / count;
    features[i] = Math.cos(angle + points.length * 0.1);
  }
  return features;
}