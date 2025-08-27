import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Zap, Sparkles, Settings, Brain } from 'lucide-react';
import { ProductPickerForm } from './forms/ProductPickerForm';
import { QuickSizesForm } from './forms/QuickSizesForm';
import UniversalOCRScanner from './UniversalOCRScanner';
import ComprehensiveTrainingDashboard from './ComprehensiveTrainingDashboard';
import { ResultCards } from './ResultCards';
import { LimitLine } from './LimitLine';
import { Glass } from './Glass';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [inputMode, setInputMode] = useState<'quick' | 'picker' | 'ocr'>('quick');
  const [showTraining, setShowTraining] = useState(false);
  
  const isProUser = unlimitedTokens || userTier === 'pro';

  const inputModes = [
    {
      id: 'quick' as const,
      label: 'Quick Sizes',
      icon: Zap,
      description: 'Enter system sizes directly'
    },
    {
      id: 'picker' as const,
      label: 'Product Picker',
      icon: Search,
      description: 'Select specific products'
    },
    {
      id: 'ocr' as const,
      label: 'Upload Quote',
      icon: FileText,
      description: 'Extract from PDF/image'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Pro Features */}
      {isProUser && (
        <Glass className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">AI Tools</h3>
              <Badge variant="default" className="bg-gradient-primary">Pro</Badge>
            </div>
            <Button
              variant={showTraining ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTraining(!showTraining)}
              className="bg-white/5 border-white/20"
            >
              <Settings className="w-4 h-4 mr-1" />
              {showTraining ? 'Hide' : 'Show'} Training Dashboard
            </Button>
          </div>
          
          {showTraining && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <ComprehensiveTrainingDashboard />
            </div>
          )}
        </Glass>
      )}

      {/* Input Mode Selection */}
      <Glass className="p-6">
        <h3 className="font-semibold mb-4">Choose Input Method</h3>
        
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {inputModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <motion.button
                key={mode.id}
                onClick={() => setInputMode(mode.id)}
                className={`
                  p-4 rounded-xl border text-left transition-all duration-200
                  ${inputMode === mode.id 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`w-5 h-5 ${inputMode === mode.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-medium">{mode.label}</span>
                  {isProUser && mode.id !== 'quick' && (
                    <Badge variant="secondary" className="ml-auto">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Enhanced
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{mode.description}</p>
              </motion.button>
            );
          })}
        </div>

        {/* Input Forms */}
        <div className="min-h-[400px]">
          {inputMode === 'quick' && (
            <QuickSizesForm onSubmit={onCalculate} />
          )}
          
          {inputMode === 'picker' && (
            <ProductPickerForm onSubmit={onCalculate} appMode={appMode} />
          )}
          
          {inputMode === 'ocr' && (
            <UniversalOCRScanner 
              onExtractComplete={(data) => {
                console.log('🔋 Universal OCR extracted:', data);
                
                let solarKw = 0;
                let batteryKwh = 0;
                
                if (data.panels?.best) {
                  solarKw = data.panels.best.arrayKwDc || 
                           (data.panels.best.count * data.panels.best.wattage / 1000) || 0;
                }
                
                if (data.battery?.best) {
                  batteryKwh = data.battery.best.usableKWh || 0;
                }
                
                const formData = {
                  mode: "ocr",
                  postcode: data.policyCalcInput?.postcode || "2000",
                  installDate: data.policyCalcInput?.installDateISO || new Date().toISOString().split('T')[0],
                  solarKw,
                  batteryKwh,
                  stcPrice: 38,
                  vppProvider: "",
                  extractedData: data
                };
                
                console.log('📊 Enhanced OCR form data:', formData);
                onCalculate(formData);
              }} 
            />
          )}
        </div>
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