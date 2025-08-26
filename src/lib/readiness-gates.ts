import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export interface ReadinessGate {
  gate: string;
  required: number;
  current: number;
  passing: boolean;
  description: string;
}

export interface ReadinessStatus {
  allPassing: boolean;
  gates: ReadinessGate[];
  message: string;
}

let readinessCache: ReadinessStatus | null = null;
let lastCheck = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

export async function checkReadinessGates(): Promise<ReadinessStatus> {
  const now = Date.now();
  
  // Return cached result if still fresh
  if (readinessCache && now - lastCheck < CACHE_TTL) {
    return readinessCache;
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
      body: { action: 'check_readiness' }
    });
    
    if (error) {
      console.error('Supabase function error:', error);
      throw error;
    }

    // Handle both success and error responses from the function
    if (data.success === false) {
      console.error('Function returned error:', data.error);
      // Return the error data structure that the function provides
      readinessCache = {
        allPassing: data.allPassing || false,
        gates: data.gates || [],
        message: data.message || 'Readiness check failed'
      };
    } else {
      // Handle successful response
      readinessCache = {
        allPassing: data.allPassing || false,
        gates: data.gates || [],
        message: data.message || 'Readiness check completed'
      };
    }
    
    lastCheck = now;
    return readinessCache;
    
  } catch (error) {
    console.error('Failed to check readiness gates:', error);
    
    // Return a failure state if we can't check
    return {
      allPassing: false,
      gates: [],
      message: 'Unable to check readiness gates - system not ready'
    };
  }
}

export async function forceReadyState(): Promise<void> {
  try {
    await supabase.functions.invoke('preboot-trainer', {
      body: { action: 'force_ready' }
    });
    
    // Clear cache to force refresh
    readinessCache = null;
    lastCheck = 0;
    
  } catch (error) {
    console.error('Failed to force ready state:', error);
    throw error;
  }
}

export async function startTraining(episodes = 50000): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('preboot-trainer', {
      body: { 
        action: 'start_training',
        episodes,
        batchSize: 1000
      }
    });
    
    if (error) throw error;
    
    console.log('Training started:', data);
    
    // Clear cache to force refresh
    readinessCache = null;
    lastCheck = 0;
    
  } catch (error) {
    console.error('Failed to start training:', error);
    throw error;
  }
}

export async function getTrainingStatus() {
  try {
    const { data, error } = await supabase.functions.invoke('preboot-trainer', {
      body: { action: 'get_training_status' }
    });
    
    if (error) throw error;
    return data;
    
  } catch (error) {
    console.error('Failed to get training status:', error);
    return {
      currentEpisodes: 0,
      targetEpisodes: 50000,
      recentMetrics: []
    };
  }
}

export function refreshReadinessCache(): void {
  readinessCache = null;
  lastCheck = 0;
}

// Hook for React components  
export function useReadinessGates() {
  const [status, setStatus] = useState<ReadinessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let mounted = true;
    
    const checkGates = async () => {
      setLoading(true);
      try {
        const result = await checkReadinessGates();
        if (mounted) {
          setStatus(result);
        }
      } catch (error) {
        console.error('Error checking gates:', error);
        if (mounted) {
          setStatus({
            allPassing: false,
            gates: [],
            message: 'Failed to check readiness'
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    checkGates();
    
    // Check every 30 seconds
    const interval = setInterval(checkGates, 30000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
  
  return { status, loading, refresh: refreshReadinessCache };
}