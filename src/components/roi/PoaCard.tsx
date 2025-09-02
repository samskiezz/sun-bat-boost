import { Skeleton } from "@/components/ui/skeleton";
import { Suspense, lazy } from "react";

const PoaChart = lazy(() => import("./PoaChart"));

interface PoaCardProps {
  daily: { date: string; poa_kwh: number }[] | undefined;
}

export default function PoaCard({ daily }: PoaCardProps) {
  if (!daily) return <Skeleton className="h-40" />;
  
  return (
    <div className="p-4 rounded-2xl border bg-white/70">
      <div className="font-medium mb-2">Physics-backed (NASA) POA</div>
      <Suspense fallback={<Skeleton className="h-32" />}>
        <PoaChart data={daily} />
      </Suspense>
    </div>
  );
}