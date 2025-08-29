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

// DEVELOPMENT MODE - Always return ready state
export async function checkReadinessGates(): Promise<ReadinessStatus> {
  console.log('checkReadinessGates: Development mode - returning ready state');
  return {
    allPassing: true,
    gates: [
      {
        gate: 'system_ready',
        required: 1,
        current: 1,
        passing: true,
        description: 'System ready for calculator access'
      }
    ],
    message: 'Development mode - system ready'
  };
}

export async function forceReadyState(): Promise<void> {
  console.log('forceReadyState: Development mode - no action needed');
}

export async function startTraining(episodes = 50000): Promise<void> {
  console.log('startTraining: Development mode - no action needed');
}

export async function getTrainingStatus() {
  console.log('getTrainingStatus: Development mode - returning mock status');
  return {
    currentEpisodes: 50000,
    targetEpisodes: 50000,
    recentMetrics: []
  };
}

export function refreshReadinessCache(): void {
  console.log('refreshReadinessCache: Development mode - no cache to refresh');
}

// Hook for React components  
export function useReadinessGates() {
  return { 
    status: {
      allPassing: true,
      gates: [],
      message: 'Development mode - system ready'
    }, 
    loading: false, 
    refresh: refreshReadinessCache 
  };
}