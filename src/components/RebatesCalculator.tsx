import React from 'react';
import { InputModeTabs } from './InputModeTabs';
import { ResultCards } from './ResultCards';
import { LimitLine } from './LimitLine';
import { Glass } from './Glass';

interface RebatesCalculatorProps {
  onCalculate: (formData: any) => void;
  results: any;
  eligibility: any;
  onRequestCall: () => void;
  appMode: any;
  userTier: 'free' | 'lite' | 'pro';
  unlimitedTokens: boolean;
}

export const RebatesCalculator: React.FC<RebatesCalculatorProps> = ({
  onCalculate,
  results,
  eligibility,
  onRequestCall,
  appMode,
  userTier,
  unlimitedTokens
}) => {
  return (
    <div className="space-y-6">
      <Glass className="p-6">
        <InputModeTabs 
          onCalculate={onCalculate} 
          appMode={appMode}
          tier={unlimitedTokens ? 'pro' : userTier}
          unlimitedTokens={unlimitedTokens}
        />
      </Glass>
      
      {results && (
        <ResultCards results={results} />
      )}
      
      {results && eligibility && (
        <div className="space-y-6">
          <LimitLine 
            status={eligibility.status}
            reasons={eligibility.reasons}
            suggestions={eligibility.suggestions}
            onRequestCall={onRequestCall}
          />
          
          <Glass className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              Figures use current published formulas and datasets.
            </p>
            <p className="text-sm text-muted-foreground">
              Verified by a CEC-accredited designer before final quote.
            </p>
          </Glass>
        </div>
      )}
    </div>
  );
};

export default RebatesCalculator;