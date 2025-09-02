import { useQuery } from "@tanstack/react-query";
import { fetchPoaDaily } from "@/api/nasaPower";
import { toAEST } from "@/utils/timeAEST";

interface UseNASAPowerProps {
  lat?: number;
  lng?: number;
  tilt?: number;
  azimuth?: number;
  enabled?: boolean;
}

export function useNASAPower({ 
  lat, 
  lng, 
  tilt = 20, 
  azimuth = 0, 
  enabled = false 
}: UseNASAPowerProps) {
  const startDate = toAEST(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const endDate = toAEST(new Date());

  return useQuery({
    queryKey: ["nasa-power", lat, lng, tilt, azimuth],
    queryFn: () => 
      fetchPoaDaily(
        lat!,
        lng!,
        tilt,
        azimuth,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      ),
    enabled: enabled && !!lat && !!lng,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  });
}