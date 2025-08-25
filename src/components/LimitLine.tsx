import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, XCircle, Lightbulb } from "lucide-react";

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
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      description: "Your system meets all requirements for maximum rebates"
    },
    yellow: {
      icon: AlertTriangle,
      title: "Good with Minor Optimizations",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      description: "Small adjustments could improve your rebate eligibility"
    },
    red: {
      icon: XCircle,
      title: "Issues Found",
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      description: "Several factors are limiting your rebate eligibility"
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className={`${config.borderColor} ${config.bgColor} border-2`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full ${config.bgColor} border ${config.borderColor}`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h3 className={`text-lg font-semibold ${config.color} mb-1`}>
                {config.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>
            </div>

            {/* Limit Line Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Too Small</span>
                <span>Ideal Range</span>
                <span>Too Large</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div className="w-1/3 bg-red-400"></div>
                  <div className="w-1/3 bg-green-400"></div>
                  <div className="w-1/3 bg-yellow-400"></div>
                </div>
                {/* Position indicator based on status */}
                <div className={`relative -mt-2 h-2`}>
                  <div 
                    className={`absolute w-3 h-3 rounded-full border-2 border-white ${
                      status === 'green' ? 'bg-green-500 left-1/2' :
                      status === 'yellow' ? 'bg-yellow-500 left-2/3' :
                      'bg-red-500 left-1/4'
                    } transform -translate-x-1/2`}
                    style={{ top: '-2px' }}
                  />
                </div>
              </div>
            </div>

            {reasons.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Key Points:</h4>
                <ul className="space-y-1">
                  {reasons.map((reason, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions && suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <h4 className="text-sm font-medium">Suggestions:</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {status === 'red' && onRequestCall && (
              <Button onClick={onRequestCall} variant="outline" className="w-full">
                Request a Call for Custom Quote
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};