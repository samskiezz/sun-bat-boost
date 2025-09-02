import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Satellite, Zap, Shield, Calendar } from "lucide-react";
import { useNASAPower } from "@/hooks/useNASAPower";
import { warnInverter4777, checkMeterUpgrade, stcDeemingYears } from "@/aus/standards";
import featureFlags, { type AppMode } from "@/config/featureFlags";
import { nowAEST } from "@/utils/timeAEST";

interface EnhancedCalculatorFeaturesProps {
  mode: AppMode;
  lat?: number;
  lng?: number;
  systemSize?: number;
  inverterSize?: number;
  showNASAData?: boolean;
}

export default function EnhancedCalculatorFeatures({
  mode,
  lat,
  lng,
  systemSize = 6.6,
  inverterSize = 6,
  showNASAData = true,
}: EnhancedCalculatorFeaturesProps) {
  const flags = featureFlags(mode);
  
  const { data: nasaData, isLoading: nasaLoading } = useNASAPower({
    lat,
    lng,
    enabled: flags.nasaIrradiance && showNASAData && !!lat && !!lng,
  });

  const ausWarnings = flags.ausComplianceGuards
    ? [
        warnInverter4777(inverterSize),
        checkMeterUpgrade(systemSize),
      ].filter(Boolean)
    : [];

  const stcYears = stcDeemingYears(nowAEST());

  return (
    <div className="space-y-3">
      {/* NASA POA Physics Badge */}
      {flags.poaPhysics && nasaData && !nasaLoading && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 border-blue-200">
            <Satellite className="w-3 h-3" />
            Physics-backed (NASA)
          </Badge>
          <span className="text-xs text-muted-foreground">
            {nasaData.daily?.length} days of satellite irradiance data
          </span>
        </div>
      )}

      {/* NASA Loading */}
      {flags.nasaIrradiance && nasaLoading && (
        <Badge variant="outline" className="flex items-center gap-1">
          <Satellite className="w-3 h-3 animate-pulse" />
          Loading NASA data...
        </Badge>
      )}

      {/* AUS Compliance Warnings */}
      {flags.ausComplianceGuards && ausWarnings.length > 0 && (
        <div className="space-y-2">
          {ausWarnings.map((warning, index) => (
            <Alert key={index} className="py-2">
              <Shield className="w-4 h-4" />
              <AlertDescription className="text-sm">{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* STC Deeming Period */}
      {flags.ausComplianceGuards && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          STC deeming period: {stcYears} years remaining
        </div>
      )}

      {/* Pro Features Available */}
      {mode === "lite" && (
        <Badge variant="outline" className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Switch to Pro for advanced physics & optimization
        </Badge>
      )}
    </div>
  );
}