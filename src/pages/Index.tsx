import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Sparkles } from "lucide-react";
import SolarCalculator from "@/components/SolarCalculator";
import EnhancedSolarCalculator from "@/components/EnhancedSolarCalculator";
import { SEOHead } from "@/components/SEOHead";

const Index = () => {
  const [useEnhancedVersion, setUseEnhancedVersion] = useState(true);
  
  return (
    <div>
      {/* Version Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border rounded-lg p-2">
          <Button
            onClick={() => setUseEnhancedVersion(!useEnhancedVersion)}
            variant={useEnhancedVersion ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Enhanced
          </Button>
          <Button
            onClick={() => setUseEnhancedVersion(!useEnhancedVersion)}
            variant={!useEnhancedVersion ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Classic
          </Button>
        </div>
      </div>

      {useEnhancedVersion ? <EnhancedSolarCalculator /> : <SolarCalculator />}
    </div>
  );
};

export default Index;
