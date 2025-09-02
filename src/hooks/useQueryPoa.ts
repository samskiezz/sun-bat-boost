import { useQuery } from "@tanstack/react-query";
import { getPoa } from "@/api/nasa";

export function useQueryPoa(params: Parameters<typeof getPoa>[0]) {
  return useQuery({ 
    queryKey: ["poa", params], 
    queryFn: () => getPoa(params), 
    enabled: !!params.lat && !!params.lng 
  });
}