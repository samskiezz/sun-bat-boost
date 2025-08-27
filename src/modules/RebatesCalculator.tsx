import React, { useState } from 'react';
import { RebatesCalculator } from "@/components/RebatesCalculator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Eye, EyeOff } from "lucide-react";
import { Glass } from "@/components/Glass";

interface RebatesCalculatorModuleProps {
  // Optional props to match original interface if needed
}

export default function RebatesCalculatorModule(props: RebatesCalculatorModuleProps = {}) {
  // User tier state - this is what controls lite/pro features
  const [userTier, setUserTier] = useState<'free' | 'lite' | 'pro'>('free');
  const [unlimitedTokens, setUnlimitedTokens] = useState(false); // Dev toggle
  const [results, setResults] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  const handleCalculate = (formData: any) => {
    console.log("Calculate rebates:", formData);
    // Your calculation logic here
    setResults({
      stc: { amount: 4200, description: "Small-scale Technology Certificates" },
      vpp: { amount: 800, description: "Virtual Power Plant incentive" },
      state: { amount: 1500, description: "State government rebate" }
    });
  };
  
  const handleRequestCall = () => {
    console.log("Request call");
  };

  // Determine app mode based on tier
  const appMode = userTier === 'free' ? 'lite' : 'pro';

  return (
    <div className="space-y-6">
      {/* Dev Controls */}
      <Glass className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-primary text-2xl">🧮</div>
            <div>
              <h2 className="text-xl font-bold">Rebates Calculator</h2>
              <p className="text-sm opacity-80">Your 3 powerful calculation methods</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Tier Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tier:</span>
              <Button
                variant={userTier === 'free' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUserTier('free')}
                className="h-8 px-3"
              >
                Free
              </Button>
              <Button
                variant={userTier === 'lite' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUserTier('lite')}
                className="h-8 px-3"
              >
                Lite
              </Button>
              <Button
                variant={userTier === 'pro' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUserTier('pro')}
                className="h-8 px-3"
              >
                Pro
              </Button>
            </div>

            {/* Dev Toggle for Unlimited Functions */}
            <Button
              variant={unlimitedTokens ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUnlimitedTokens(!unlimitedTokens)}
              className="h-8 px-3 flex items-center gap-2"
            >
              <Settings className="w-3 h-3" />
              {unlimitedTokens ? 'Unlimited ON' : 'Dev Mode'}
            </Button>

            {/* Status Badges */}
            <div className="flex items-center gap-2">
              <Badge variant={userTier === 'pro' ? 'default' : userTier === 'lite' ? 'secondary' : 'outline'}>
                {userTier.toUpperCase()}
              </Badge>
              {unlimitedTokens && (
                <Badge variant="default" className="bg-emerald-600">
                  DEV
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Glass>

      {/* Main Calculator */}
      <RebatesCalculator
        onCalculate={handleCalculate}
        results={results}
        eligibility={eligibility}
        onRequestCall={handleRequestCall}
        appMode={appMode}
        userTier={userTier}
        unlimitedTokens={unlimitedTokens}
      />
    </div>
  );
}