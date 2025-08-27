import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Info, Zap, Battery, Plug, DollarSign, CreditCard } from "lucide-react";
import { useState } from "react";

interface CalculationResult {
  rebateResults?: {
    solar?: {
      stc_value_aud: number;
      stcs: number;
      total_rebate_aud: number;
      battery_program: {
        name: string;
        battery_rebate_aud: number;
      };
      vpp: {
        provider: string;
        vpp_incentive_aud: number;
      };
    };
    battery?: {
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
    total_rebates: number;
  };
  postcode?: string;
  solarKw?: number;
  batteryKwh?: number;
  installDate?: string;
  stcPrice?: number;
  vppProvider?: string;
}

interface ResultCardsProps {
  results: CalculationResult;
}

export const ResultCards = ({ results }: ResultCardsProps) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  if (!results.rebateResults?.solar && !results.rebateResults?.battery) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>No rebate information available</p>
            <p className="text-sm">Enter system details to see rebate calculations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals from the actual data
  const solarRebate = results.rebateResults?.solar?.total_rebate_aud || 0;
  const batteryFederal = results.rebateResults?.battery?.federal_discount || 0;
  const batteryState = results.rebateResults?.battery?.state_rebate || 0;
  const batteryVpp = results.rebateResults?.battery?.vpp_bonus || 0;
  const batteryNt = results.rebateResults?.battery?.nt_grant || 0;
  
  const totals = {
    federal: solarRebate + batteryFederal,
    state: batteryState + batteryNt,
    vpp: batteryVpp,
    today: solarRebate + batteryFederal + batteryState + batteryVpp + batteryNt
  };

  const getSolarSTCDetails = () => {
    if (!results.rebateResults?.solar) return [];
    return [
      `Solar panel STCs: ${results.rebateResults.solar.stcs || 0} certificates`,
      `STC value: $${results.rebateResults.solar.stc_value_aud?.toLocaleString() || 0}`,
      `Solar capacity: ${results.solarKw || 0}kW`
    ];
  };

  const getBatterySTCDetails = () => {
    if (!results.rebateResults?.battery) return [];
    const federalNotes = results.rebateResults.battery.eligibility_notes.filter(note => 
      note.includes('Federal STC') || note.includes('STCs')
    );
    return [
      `Battery STC discount: $${results.rebateResults.battery.federal_discount?.toLocaleString() || 0}`,
      `Battery capacity: ${results.batteryKwh || 0}kWh`,
      ...federalNotes
    ];
  };

  const cards = [
    {
      id: "federal",
      title: "Federal STC Discount",
      value: totals.federal,
      icon: Zap,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Solar Panel & Battery STCs",
      details: [
        ...getSolarSTCDetails(),
        ...getBatterySTCDetails()
      ]
    },
    {
      id: "state",
      title: "State Rebates",
      value: totals.state,
      icon: Battery,
      color: "text-green-600", 
      bgColor: "bg-green-50",
      description: "State and territory incentives",
      details: results.rebateResults?.battery?.eligibility_notes.filter(note => 
        note.includes('rebate') || note.includes('grant')
      ) || []
    },
    {
      id: "vpp",
      title: "VPP Bonuses",
      value: totals.vpp,
      icon: Plug,
      color: "text-purple-600",
      bgColor: "bg-purple-50", 
      description: "Virtual Power Plant signup incentives",
      details: results.rebateResults?.battery?.eligibility_notes.filter(note => 
        note.includes('VPP') || note.includes('Virtual Power Plant')
      ) || []
    },
    {
      id: "total",
      title: "Total Cash Benefits",
      value: totals.today,
      icon: DollarSign,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Total upfront cash incentives",
      details: [
        `Federal STCs: $${totals.federal.toLocaleString()}`,
        `State Rebates: $${totals.state.toLocaleString()}`,
        `VPP Bonuses: $${totals.vpp.toLocaleString()}`,
        ...(results.rebateResults?.battery?.nt_grant && results.rebateResults.battery.nt_grant > 0 ? [`NT Grant: $${results.rebateResults.battery.nt_grant.toLocaleString()}`] : [])
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
      {results.rebateResults?.battery?.financing_options && results.rebateResults.battery.financing_options.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Available Financing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {results.rebateResults.battery.financing_options.map((option, index) => (
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