import { useEffect, useState } from "react";
import { getMissing, subscribeToSignals } from "./signals";
import type { SignalKey } from "./signals";

interface WaitingForProps {
  deps: SignalKey[];
}

export function WaitingFor({ deps }: WaitingForProps) {
  const [missing, setMissing] = useState(() => getMissing(deps));

  useEffect(() => {
    const updateMissing = () => setMissing(getMissing(deps));
    updateMissing(); // Update immediately
    const unsubscribe = subscribeToSignals(updateMissing);
    return unsubscribe;
  }, [deps]);

  return missing.length ? (
    <div className="text-xs opacity-70 text-amber-600">
      Waiting for: {missing.join(", ")}
    </div>
  ) : null;
}