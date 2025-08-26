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
    if (isExtracting) return;
    
    setIsExtracting(true);
    setProgress(0);
    setCurrentProduct('Starting continuous specs extraction...');
    setResult(null);
    
    try {
      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailures = 0;
      let iterationCount = 0;
      
      // Keep processing until no more products need specs
      while (iterationCount < 20) { // Safety limit
        iterationCount++;
        console.log(`🔄 Iteration ${iterationCount}: Getting products needing specs...`);
        setCurrentProduct(`Iteration ${iterationCount}: Checking for products needing specs...`);
        
        // Get products that need specs using our RPC
        const { data: products, error: productsError } = await supabase.rpc('get_products_needing_specs');
        
        if (productsError) {
          throw new Error(`Failed to get products: ${productsError.message}`);
        }
        
        if (!products || products.length === 0) {
          console.log('🎉 All products have sufficient specs!');
          setCurrentProduct('All products complete!');
          toast({
            title: "All Products Complete! 🎉",
            description: "All products now have 6+ comprehensive specifications",
          });
          break;
        }
        
        console.log(`📋 Iteration ${iterationCount}: Found ${products.length} products needing specs`);
        setCurrentProduct(`Iteration ${iterationCount}: Processing ${products.length} products...`);
        
        // Process more products per iteration (100 instead of 20)
        const batchSize = 50;
        const maxProductsPerIteration = 200; // Process up to 200 products per iteration
        const productsToProcess = products.slice(0, maxProductsPerIteration);
        const productIds = productsToProcess.map(p => p.product_id);
        
        let iterationProcessed = 0;
        let iterationSuccessful = 0;
        let iterationFailures = 0;
        
        for (let i = 0; i < productIds.length; i += batchSize) {
          const batch = productIds.slice(i, i + batchSize);
          const batchNumber = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(productIds.length / batchSize);
          
          setProgress(((i / productIds.length) * 90) + (iterationCount - 1) * 5);
          setCurrentProduct(`Iteration ${iterationCount} - Batch ${batchNumber}/${totalBatches}: Processing ${batch.length} products...`);
          
          console.log(`📦 Iteration ${iterationCount} - Batch ${batchNumber}: ${batch.length} products`);
          
          const response = await supabase.functions.invoke('specs-enhancer', {
            body: { 
              action: 'enhance_list', 
              productIds: batch 
            }
          });
          
          if (response.error) {
            console.error('Batch processing error:', response.error);
            iterationFailures += batch.length;
          } else if (response.data) {
            const batchResult = response.data;
            iterationProcessed += batchResult.processed || 0;
            iterationSuccessful += batchResult.successful || 0;
            iterationFailures += batchResult.failures || 0;
            
            console.log(`✅ Batch complete: ${batchResult.successful}/${batchResult.processed} successful`);
          }
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        totalProcessed += iterationProcessed;
        totalSuccessful += iterationSuccessful;
        totalFailures += iterationFailures;
        
        console.log(`✅ Iteration ${iterationCount} complete: ${iterationProcessed} processed, ${iterationSuccessful} successful`);
        setCurrentProduct(`Iteration ${iterationCount} complete: ${iterationSuccessful}/${iterationProcessed} successful. Total: ${totalSuccessful}/${totalProcessed}`);
        
        // Update progress after each iteration
        await handleUpdateProgress();
        
        // Brief pause between iterations
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // If we processed fewer than the batch size, we're likely done
        if (productsToProcess.length < maxProductsPerIteration) {
          console.log('🏁 Processed all available products, checking completion...');
        }
      }
      
      setProgress(100);
      setCurrentProduct('Complete!');
      
      const result = {
        success: true,
        processed: totalProcessed,
        successful: totalSuccessful,
        failures: totalFailures,
        iterations: iterationCount
      };
      
      console.log('Final extraction result:', result);
      setResult(result);
      
      toast({
        title: "Continuous Extraction Complete!",
        description: `Completed ${iterationCount} iterations. Processed ${totalProcessed} products with ${totalSuccessful} successful extractions`,
      });
      
    } catch (error) {
      console.error('Real extraction error:', error);
      toast({
        title: "Extraction Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
      setProgress(0);
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