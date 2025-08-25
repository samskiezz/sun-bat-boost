import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, XCircle, Lightbulb, Zap } from "lucide-react";

export type LimitStatus = "green" | "yellow" | "red";

interface LimitLineProps {
  status: LimitStatus;
  reasons: string[];
  suggestions?: string[];
  onRequestCall?: () => void;
}

export const LimitLine = ({ status, reasons, suggestions, onRequestCall }: LimitLineProps) => {
  const statusConfig = {
    green: {
      icon: CheckCircle,
      title: "Perfect Setup",
      color: "text-emerald-400",
      bgColor: "from-emerald-500/20 to-green-400/10",
      borderColor: "border-emerald-400/30",
      glowColor: "shadow-emerald-500/25",
      description: "Your system meets all requirements for maximum rebates"
    },
    yellow: {
      icon: AlertTriangle,
      title: "Good with Minor Optimizations",
      color: "text-amber-400",
      bgColor: "from-amber-500/20 to-yellow-400/10",
      borderColor: "border-amber-400/30",
      glowColor: "shadow-amber-500/25",
      description: "Small adjustments could improve your rebate eligibility"
    },
    red: {
      icon: XCircle,
      title: "Issues Found",
      color: "text-red-400",
      bgColor: "from-red-500/20 to-rose-400/10",
      borderColor: "border-red-400/30",
      glowColor: "shadow-red-500/25",
      description: "Several factors are limiting your rebate eligibility"
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className={`relative overflow-hidden ${config.borderColor} border backdrop-blur-xl bg-gradient-to-br ${config.bgColor} shadow-2xl ${config.glowColor}`}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
      
      <CardContent className="p-8 relative z-10">
        <div className="flex items-start gap-6">
          {/* Futuristic icon container */}
          <div className={`relative p-4 rounded-2xl bg-gradient-to-br ${config.bgColor} ${config.borderColor} border backdrop-blur-sm`}>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
            <Icon className={`w-8 h-8 ${config.color} relative z-10`} />
            <div className={`absolute inset-0 rounded-2xl shadow-lg ${config.glowColor} animate-pulse`} />
          </div>
          
          <div className="flex-1 space-y-6">
            {/* Header section */}
            <div className="space-y-2">
              <h3 className={`text-2xl font-bold ${config.color} tracking-tight`}>
                {config.title}
              </h3>
              <p className="text-muted-foreground/80 text-lg">
                {config.description}
              </p>
            </div>

            {/* Futuristic limit meter */}
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium text-muted-foreground/70">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  Too Small
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  Ideal Range
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  Limited Rebates
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  No Additional Rebates
                </span>
              </div>
              
              {/* Modern gradient meter */}
              <div className="relative h-4 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 overflow-hidden">
                {/* Gradient segments */}
                <div className="h-full flex">
                  {/* Too small - 25% */}
                  <div className="w-1/4 bg-gradient-to-r from-red-500 to-red-400 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
                  </div>
                  {/* Ideal range - 35% */}
                  <div className="w-[35%] bg-gradient-to-r from-emerald-500 to-green-400 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
                  </div>
                  {/* Limited rebates - 25% */}
                  <div className="w-1/4 bg-gradient-to-r from-amber-500 to-yellow-400 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
                  </div>
                  {/* No additional rebates - 15% */}
                  <div className="w-[15%] bg-gradient-to-r from-orange-500 to-red-500 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
                  </div>
                </div>
                
                {/* Position indicator with glow effect */}
                <div className="absolute -top-1 h-6">
                  <div 
                    className={`absolute w-6 h-6 rounded-full border-3 border-white shadow-lg backdrop-blur-sm transform -translate-x-1/2 ${
                      status === 'green' ? 'bg-emerald-400 left-[42.5%] shadow-emerald-400/50' :
                      status === 'yellow' ? 'bg-amber-400 left-[70%] shadow-amber-400/50' :
                      'bg-red-400 left-[20%] shadow-red-400/50'
                    } animate-pulse`}
                  >
                    <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/40 to-transparent" />
                  </div>
                </div>
                
                {/* Rebate cutoff markers */}
                <div className="absolute -bottom-6 w-full flex justify-between text-xs text-muted-foreground/60 font-medium">
                  <span>0kW</span>
                  <span className="absolute left-[60%] transform -translate-x-1/2">28kWh Limit</span>
                  <span className="absolute left-[85%] transform -translate-x-1/2">48kWh Cap</span>
                  <span>Max</span>
                </div>
              </div>
            </div>

            {/* Key points section */}
            {reasons.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Key Points:
                </h4>
                <div className="grid gap-2">
                  {reasons.map((reason, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 animate-pulse" />
                      <span className="text-sm text-foreground/90 leading-relaxed">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions section */}
            {suggestions && suggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-400/10 border border-amber-400/30">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground">AI Suggestions:</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="px-3 py-1.5 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-all duration-300 backdrop-blur-sm"
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Call to action */}
            {status === 'red' && onRequestCall && (
              <div className="pt-4">
                <Button 
                  onClick={onRequestCall} 
                  className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-white shadow-lg hover:shadow-primary/25 transition-all duration-300 py-6 text-lg font-semibold backdrop-blur-sm border border-primary/20"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Request Expert Consultation
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};