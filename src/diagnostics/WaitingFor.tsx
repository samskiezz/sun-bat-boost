import { getMissing } from "./signals";
import type { SignalKey } from "./signals";

interface WaitingForProps {
  deps: SignalKey[];
}

export function WaitingFor({ deps }: WaitingForProps) {
  const missing = getMissing(deps);
  return missing.length ? (
    <div className="text-xs opacity-70 text-amber-600">
      Waiting for: {missing.join(", ")}
    </div>
  ) : null;
}