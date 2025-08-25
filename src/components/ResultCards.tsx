import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Info, Zap, Battery, Plug, DollarSign, CreditCard } from "lucide-react";
import { useState } from "react";

interface CalculationResult {
  totals: {
    today: number;
    federal: number;
    state: number;
    vpp: number;
  };
  rebates?: {
    federal_discount: number;
    state_rebate: number;
    vpp_bonus: number;
    nt_grant: number;
    total_cash_incentive: number;
    financing_options: Array<{
      type: string;
      provider: string;
      amount: number;
      rate: number;
      term_years: number;
      description: string;
    }>;
    eligibility_notes: string[];
  };
  input?: {
    postcode: string;
    solarKw: number;
    batteryKwh?: number;
    installDate: string;
    stcPrice: number;
    vppProvider?: string;
  };
}

interface ResultCardsProps {
  results: CalculationResult;
}

export const ResultCards = ({ results }: ResultCardsProps) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  if (!results.rebates) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>No rebate information available</p>
            <p className="text-sm">Enter battery details to see rebate calculations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cards = [
    {
      id: "federal",
      title: "Federal STC Discount",
      value: results.totals.federal,
      icon: Zap,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Small-scale Technology Certificates",
      details: [
        `Battery capacity: ${results.input?.batteryKwh || 0}kWh`,
        `STC price: $${results.input?.stcPrice || 40}`,
        `Install date: ${results.input?.installDate || 'Not set'}`
      ]
    },
    {
      id: "state",
      title: "State Rebates",
      value: results.totals.state,
      icon: Battery,
      color: "text-green-600", 
      bgColor: "bg-green-50",
      description: "State and territory incentives",
      details: results.rebates.eligibility_notes.filter(note => 
        note.includes('rebate') || note.includes('grant')
      )
    },
    {
      id: "vpp",
      title: "VPP Bonuses",
      value: results.totals.vpp,
      icon: Plug,
      color: "text-purple-600",
      bgColor: "bg-purple-50", 
      description: "Virtual Power Plant signup incentives",
      details: results.rebates.eligibility_notes.filter(note => 
        note.includes('VPP') || note.includes('Virtual Power Plant')
      )
    },
    {
      id: "total",
      title: "Total Cash Benefits",
      value: results.totals.today,
      icon: DollarSign,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Total upfront cash incentives",
      details: [
        `Federal: $${results.totals.federal.toLocaleString()}`,
        `State: $${results.totals.state.toLocaleString()}`,
        `VPP: $${results.totals.vpp.toLocaleString()}`,
        ...(results.rebates.nt_grant > 0 ? [`NT Grant: $${results.rebates.nt_grant.toLocaleString()}`] : [])
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const isExpanded = expandedCard === card.id;
          
          return (
            <Card key={card.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold">
                    ${card.value.toLocaleString()}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <CardDescription className="text-xs">{card.description}</CardDescription>
              </CardHeader>
              
              {card.details && card.details.length > 0 && (
                <Collapsible open={isExpanded} onOpenChange={(open) => setExpandedCard(open ? card.id : null)}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-between px-6 py-2"
                    >
                      <span className="flex items-center gap-2">
                        <Info className="h-3 w-3" />
                        Details
                      </span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      <div className="space-y-2">
                        {card.details.map((detail, index) => (
                          <div key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                            {detail}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </Card>
          );
        })}
      </div>
      
      {/* Financing Options */}
      {results.rebates.financing_options && results.rebates.financing_options.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Available Financing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {results.rebates.financing_options.map((option, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{option.provider}</span>
                    <Badge variant="secondary">
                      {option.rate === 0 ? 'Interest Free' : `${(option.rate * 100).toFixed(1)}% p.a.`}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
                  <div className="text-sm">
                    Up to ${option.amount.toLocaleString()} • {option.term_years} years maximum
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};