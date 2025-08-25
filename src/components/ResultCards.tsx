import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Info, Zap, Battery, Plug, DollarSign } from "lucide-react";
import { useState } from "react";

interface CalculationResult {
  stc: {
    count: number;
    value: number;
    zone: number;
    years: number;
  };
  battery: {
    total: number;
    programs: Array<{ name: string; value: number; description: string }>;
  };
  vpp: {
    signup: number;
    estAnnual: number;
  };
  totals: {
    today: number;
    breakdown: Array<{ category: string; amount: number }>;
  };
  assumptions: {
    stcPrice: number;
    zone: string;
    installDate: string;
  };
}

interface ResultCardsProps {
  results: CalculationResult;
}

export const ResultCards = ({ results }: ResultCardsProps) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const cards = [
    {
      id: "stc",
      title: "STC Rebate",
      value: results.stc.value,
      icon: Zap,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: `${results.stc.count} certificates × $${results.assumptions.stcPrice}`,
      details: [
        `Zone ${results.stc.zone} multiplier applied`,
        `${results.stc.years} deeming years remaining`,
        `Based on install date: ${results.assumptions.installDate}`
      ]
    },
    {
      id: "battery",
      title: "Battery Rebates",
      value: results.battery.total,
      icon: Battery,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: `${results.battery.programs.length} programs available`,
      details: results.battery.programs.map(p => `${p.name}: $${p.value.toLocaleString()}`)
    },
    {
      id: "vpp",
      title: "VPP Signup",
      value: results.vpp.signup,
      icon: Plug,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: `Plus $${results.vpp.estAnnual}/year ongoing`,
      details: [
        "One-time signup bonus",
        `Estimated annual rewards: $${results.vpp.estAnnual}`,
        "Based on typical usage patterns"
      ]
    },
    {
      id: "total",
      title: "Total Today",
      value: results.totals.today,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/5",
      description: "Available rebates right now",
      details: results.totals.breakdown.map(b => `${b.category}: $${b.amount.toLocaleString()}`)
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isExpanded = expandedCard === card.id;
        
        return (
          <Card key={card.id} className="backdrop-blur-sm bg-gradient-glass border-white/20 hover:shadow-glow transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <Collapsible open={isExpanded} onOpenChange={() => setExpandedCard(isExpanded ? null : card.id)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1">
                      <Info className="w-4 h-4" />
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </div>
              <CardTitle className="text-lg">{card.title}</CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">
                  ${card.value.toLocaleString()}
                </div>
                <CardDescription>{card.description}</CardDescription>
                
                <Collapsible open={isExpanded}>
                  <CollapsibleContent className="space-y-2">
                    <div className="border-t pt-2 mt-2">
                      <p className="text-sm font-medium mb-1">How it's calculated:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {card.details.map((detail, index) => (
                          <li key={index}>• {detail}</li>
                        ))}
                      </ul>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};