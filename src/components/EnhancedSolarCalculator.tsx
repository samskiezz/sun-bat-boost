import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from './SEOHead';
import { InitialDataLoader } from './InitialDataLoader';
import LocationSiteAnalysis from './LocationSiteAnalysis';
import EnhancedSystemSizing from './EnhancedSystemSizing';
import { Glass } from './Glass';

type WizardStep = 'location-site' | 'system-sizing' | 'savings-roi' | 'results';

interface WizardData {
  locationData?: any;
  siteData?: any;
  evData?: any;
  systemData?: any;
  billData?: any;
}

const STEPS = [
  { id: 'location-site', title: 'Site Analysis', description: 'Location & Configuration' },
  { id: 'system-sizing', title: 'AI System Sizing', description: 'Smart Recommendations' },
  { id: 'savings-roi', title: 'Savings Analysis', description: 'Financial Projections' },
  { id: 'results', title: 'Final Results', description: 'Get Your Quote' }
];

export const EnhancedSolarCalculator: React.FC = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>('location-site');
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  const getCurrentStepIndex = useCallback(() => {
    return STEPS.findIndex(step => step.id === currentStep);
  }, [currentStep]);

  const nextStep = useCallback(() => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < STEPS.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(STEPS[currentIndex + 1].id as WizardStep);
        setIsTransitioning(false);
      }, 300);
    }
  }, [getCurrentStepIndex]);

  const prevStep = useCallback(() => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(STEPS[currentIndex - 1].id as WizardStep);
        setIsTransitioning(false);
      }, 300);
    }
  }, [getCurrentStepIndex]);

  const handleLocationUpdate = useCallback((locationData: any) => {
    setWizardData(prev => ({ ...prev, locationData }));
    console.log('Location updated:', locationData);
  }, []);

  const handleSiteUpdate = useCallback((siteData: any) => {
    setWizardData(prev => ({ ...prev, siteData }));
    console.log('Site analysis updated:', siteData);
  }, []);

  const handleEVUpdate = useCallback((evData: any) => {
    setWizardData(prev => ({ ...prev, evData }));
    console.log('EV data updated:', evData);
  }, []);

  const handleSystemUpdate = useCallback((systemData: any) => {
    setWizardData(prev => ({ ...prev, systemData }));
    console.log('System sizing updated:', systemData);
  }, []);

  // Realistic Australian household bill data
  const billData = {
    monthlyUsage: 850,
    monthlyBill: 280,
    quarterlyUsage: 2550,
    quarterlyBill: 840,
    peakUsage: 850, // Quarterly peak usage
    offPeakUsage: 1700, // Quarterly off-peak usage  
    peakRate: 0.32,
    offPeakRate: 0.18,
    dailySupply: 95,
    averageRate: 0.27
  };

  const progress = ((getCurrentStepIndex() + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SEOHead />
      <InitialDataLoader />
      
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Solar System Calculator</h1>
            <p className="text-muted-foreground">
              AI-powered solar system sizing with comprehensive site analysis
            </p>
          </div>
          
          {/* Progress Indicator */}
          <div className="mt-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                    ${index <= getCurrentStepIndex() 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-muted bg-background'
                    }
                  `}>
                    {index < getCurrentStepIndex() ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="ml-3 text-left">
                    <div className={`text-sm font-medium ${
                      index === getCurrentStepIndex() ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {step.description}
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-0.5 w-16 mx-4 transition-all ${
                      index < getCurrentStepIndex() ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {!isTransitioning && (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep === 'location-site' && (
                  <LocationSiteAnalysis
                    onLocationUpdate={handleLocationUpdate}
                    onSiteUpdate={handleSiteUpdate}
                    onEVUpdate={handleEVUpdate}
                    onNext={nextStep}
                  />
                )}

                {currentStep === 'system-sizing' && (
                  <EnhancedSystemSizing
                    billData={billData}
                    locationData={wizardData.locationData}
                    siteData={wizardData.siteData}
                    evData={wizardData.evData}
                    systemSize={wizardData.systemData}
                    existingPvKw={wizardData.locationData?.existingPvKw || 0}
                    onSystemUpdate={handleSystemUpdate}
                    onNext={nextStep}
                    onPrevious={prevStep}
                  />
                )}

                {currentStep === 'savings-roi' && (
                  <Glass className="p-8 text-center">
                    <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-4">Savings Analysis</h2>
                    <p className="text-muted-foreground mb-8">
                      Calculating your financial projections and return on investment...
                    </p>
                    <div className="flex justify-between">
                      <Button onClick={prevStep} variant="outline" size="lg">
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      <Button onClick={nextStep} className="bg-gradient-primary" size="lg">
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </Glass>
                )}

                {currentStep === 'results' && (
                  <Glass className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-4">Analysis Complete!</h2>
                    <p className="text-muted-foreground mb-8">
                      Your personalized solar system design is ready. Get a detailed proposal from our experts.
                    </p>
                    <div className="flex justify-center gap-4">
                      <Button onClick={prevStep} variant="outline" size="lg">
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      <Button className="bg-gradient-primary" size="lg">
                        Get Your Quote
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </Glass>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSolarCalculator;