import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { extractRealSpecsForProducts, updateProgressOnly } from '@/utils/realSpecsExtractor';
import { updateProgressAndGatesNow } from '@/utils/directProgressUpdater';
import { fixJobProgressData } from '@/utils/jobProgressFixer';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Globe, Zap, Brain, RefreshCw, Wrench } from 'lucide-react';

export const RealSpecsExtractor = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [progress, setProgress] = useState(0);  
  const [currentProduct, setCurrentProduct] = useState('');
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  // Auto-fix job progress on component mount using edge function
  useEffect(() => {
    const initializeFix = async () => {
      try {
        console.log('🔧 Auto-fixing job progress on mount...');
        
        // Call the force sync edge function
        const { data, error } = await supabase.functions.invoke('force-progress-sync');
        
        if (error) {
          console.error('Force sync error:', error);
        } else {
          console.log('✅ Force sync completed:', data);
        }
      } catch (error) {
        console.error('Error in auto-fix:', error);
      }
    };
    
    initializeFix();
  }, []);

  const handleFixJobProgress = async () => {
    setIsFixing(true);
    try {
      const result = await fixJobProgressData();
      toast({
        title: result.success ? "Job Progress Fixed!" : "Fix Failed",
        description: result.success ? "All job progress data has been cleaned up and corrected" : result.error,
        variant: result.success ? "default" : "destructive",
        duration: 4000,
      });
    } catch (error) {
      console.error('Error fixing job progress:', error);
      toast({
        title: "Fix Failed",
        description: "Failed to fix job progress data",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleUpdateProgress = async () => {
    setIsUpdating(true);
    try {
      await updateProgressAndGatesNow();
      toast({
        title: "Progress Updated!",
        description: "Job progress and readiness gates have been refreshed with current data",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update progress",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRealExtraction = async () => {
    setIsExtracting(true);
    setProgress(0);
    setResult(null);
    setCurrentProduct('Initializing...');
    
    try {
      // Simulate progress tracking
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 85) return prev + Math.random() * 3;
          return prev;
        });
      }, 800);

      const result = await extractRealSpecsForProducts();
      
      clearInterval(progressInterval);
      setProgress(100);
      setCurrentProduct('Complete!');
      setResult(result);
      
      if (result.success) {
        // Trigger progress refresh after successful extraction
        handleUpdateProgress();
        
        toast({
          title: "Real Specs Extraction Successful!",
          description: `Processed ${result.processed} products with ${result.successful} successful extractions`,
          duration: 6000,
        });
      } else {
        toast({
          title: "Extraction Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error in real extraction:', error);
      toast({
        title: "Error",
        description: "Failed to run real specs extraction",
        variant: "destructive",
        duration: 5000,
      });
      setResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsExtracting(false);
      setCurrentProduct('');
    }
  };

  return (
    <Card className="w-full border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Brain className="h-5 w-5" />
          Real AI + Google Specs Extractor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-blue-600">This uses the SAME system that worked for all 2,411 inverters:</p>
          <ul className="list-disc list-inside space-y-1">
            <li className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              OpenAI GPT-4 extraction from PDF content
            </li>
            <li className="flex items-center gap-2">
              <Search className="h-4 w-4 text-green-500" />
              Google Search API for missing datasheets
            </li>
            <li className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-orange-500" />
              Web scraping from manufacturer websites
            </li>
            <li className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Processes ALL categories: Panels, Batteries & Inverters
            </li>
          </ul>
        </div>

        {isExtracting && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              {currentProduct}
            </div>
            <Progress value={progress} className="w-full h-2" />
            <div className="text-xs text-muted-foreground text-center">
              Using real AI + Google extraction (not shortcuts)
            </div>
          </div>
        )}

        {result && (
          <div className={`p-4 rounded-lg text-sm ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="font-medium mb-2 flex items-center gap-2">
              {result.success ? (
                <>
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">Real Extraction Complete!</span>
                </>
              ) : (
                <span className="text-red-700">❌ Extraction Failed</span>
              )}
            </div>
            {result.success ? (
              <div className="space-y-1 text-green-700">
                <div>✅ Processed: {result.processed} products</div>
                <div>🎯 Successful API calls: {result.successful}</div>
                <div>📊 Final comprehensive specs:</div>
                <div className="ml-4">
                  • Panels: {result.finalStats?.panels || 0} with 6+ specs
                </div>
                <div className="ml-4">
                  • Batteries: {result.finalStats?.batteries || 0} with 6+ specs
                </div>
                <div className="ml-4">
                  • Inverters: {result.finalStats?.inverters || 0} with 6+ specs
                </div>
              </div>
            ) : (
              <div className="text-red-700">Error: {result.error}</div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={handleRealExtraction}
            disabled={isExtracting || isUpdating || isFixing}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            {isExtracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting Real Specs...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Extract REAL Specs (All Categories)
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleFixJobProgress}
            disabled={isExtracting || isUpdating || isFixing}
            variant="outline"
            size="lg"
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            {isFixing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wrench className="h-4 w-4" />
            )}
          </Button>
          
          <Button 
            onClick={handleUpdateProgress}
            disabled={isExtracting || isUpdating || isFixing}
            variant="outline"
            size="lg"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="text-xs text-center text-muted-foreground">
          This uses OpenAI GPT-4 + Google Search + Web Scraping<br/>
          Works for ALL categories: Panels, Batteries & Inverters<br/>
          🔧 Orange button fixes job progress data issues
        </div>
      </CardContent>
    </Card>
  );
};