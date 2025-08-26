import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { runComprehensiveSpecsCompletion } from '@/utils/comprehensiveSpecsCompleter';
import { Loader2, Search, Globe, Zap } from 'lucide-react';

export const ComprehensiveSpecsCompleter = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleRunCompletion = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults(null);
    
    try {
      setCurrentStep('🔍 Google Fallback Scraping');
      setProgress(20);
      
      const result = await runComprehensiveSpecsCompletion();
      
      setCurrentStep('✅ Process Complete');
      setProgress(100);
      setResults(result);
      
        if (result.success) {
          toast({
            title: "Comprehensive Specs Completion Successful",
            description: `Panels: ${(result as any).panels?.completion_rate}, Batteries: ${(result as any).batteries?.completion_rate}`,
            duration: 5000,
          });
        } else {
          toast({
            title: "Completion Failed",
            description: (result as any).error || "Unknown error occurred",
            variant: "destructive",
            duration: 5000,
          });
        }
    } catch (error) {
      console.error('Error running comprehensive completion:', error);
      toast({
        title: "Error",
        description: "Failed to run comprehensive specs completion",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsRunning(false);
      setCurrentStep('');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Comprehensive Specs Completer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>This will run the complete specs enhancement process:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Google fallback scraping for missing datasheets
            </li>
            <li className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Enhanced web scraper for additional coverage
            </li>
            <li className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              AI-powered specs extraction with fallbacks
            </li>
          </ul>
        </div>

        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {currentStep}
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {results && (
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <div className="font-medium mb-2">Results:</div>
            {results.success ? (
              <div className="space-y-1">
                <div>Panels: {(results as any).panels?.with_specs}/{(results as any).panels?.total} ({(results as any).panels?.completion_rate})</div>
                <div>Batteries: {(results as any).batteries?.with_specs}/{(results as any).batteries?.total} ({(results as any).batteries?.completion_rate})</div>
              </div>
            ) : (
              <div className="text-destructive">Error: {(results as any).error}</div>
            )}
          </div>
        )}

        <Button 
          onClick={handleRunCompletion}
          disabled={isRunning}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Comprehensive Enhancement...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Run Comprehensive Specs Completion
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};