// Model telemetry status strip
import { Badge } from "@/components/ui/badge";
import { tokens } from "@/theme/tokens";
import { cn } from "@/lib/utils";
import { Activity, Zap, AlertTriangle } from "lucide-react";
import { formatNumber } from "@/utils/format";

interface StatusStripProps {
  model?: string;
  version?: string;
  dataDate?: string;
  p95?: number;
  mae?: number;
  delta?: number;
  error?: string;
  className?: string;
}

export function StatusStrip({
  model = "model",
  version = "v1.0",
  dataDate,
  p95,
  mae,
  delta,
  error,
  className
}: StatusStripProps) {
  const getStatusColor = () => {
    if (error) return tokens.statusError;
    if (p95 && p95 > 150) return tokens.statusWarning;
    return tokens.statusSuccess;
  };

  const formatDelta = (val?: number) => {
    if (val === undefined || val === null) return "";
    return val >= 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`;
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-3 text-xs",
      tokens.panel,
      "border-t border-white/10",
      className
    )}>
      <div className="flex items-center gap-4 text-white/70">
        {/* Model Info */}
        <div className="flex items-center gap-2">
          <Zap className="h-3 w-3" />
          <span>Model: {model} {version}</span>
        </div>

        {/* Data Date */}
        {dataDate && (
          <div className="flex items-center gap-1">
            <span>Data: {dataDate}</span>
          </div>
        )}

        {/* Performance Metrics */}
        {p95 !== undefined && (
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            <span>p95: {formatNumber(p95)}ms</span>
          </div>
        )}

        {/* Model Accuracy */}
        {mae !== undefined && (
          <span>MAE($): {formatNumber(mae)}</span>
        )}

        {/* Delta vs Last */}
        {delta !== undefined && (
          <span>Δ vs last: {formatDelta(delta)}</span>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        {error ? (
          <Badge className={cn(getStatusColor(), "flex items-center gap-1")}>
            <AlertTriangle className="h-3 w-3" />
            Model unavailable
          </Badge>
        ) : (
          <Badge className={getStatusColor()}>
            Active
          </Badge>
        )}
      </div>
    </div>
  );
}