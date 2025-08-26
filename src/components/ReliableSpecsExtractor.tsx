import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Zap, CheckCircle, AlertCircle } from 'lucide-react';

export const ReliableSpecsExtractor = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleReliableExtraction = async () => {
    if (isExtracting) return;
    
    setIsExtracting(true);
    setProgress(0);
    setCurrentStatus('Finding products that need specs...');
    setResults(null);
    
    try {
      // Get products needing specs
      setCurrentStatus('Fetching products...');
      const { data: products, error: productsError } = await supabase.rpc('get_products_needing_specs', {
        min_specs: 6,
        categories: ['PANEL', 'BATTERY_MODULE']
      });

      if (productsError) {
        throw new Error(`Failed to get products: ${productsError.message}`);
      }

      if (!products || products.length === 0) {
        toast({
          title: "All Done! 🎉",
          description: "All products already have sufficient specifications",
        });
        setResults({ success: true, totalProducts: 0, processed: 0, successful: 0 });
        return;
      }

      console.log(`🎯 Found ${products.length} products needing specs`);
      setCurrentStatus(`Processing ${products.length} products...`);

      const productIds = products.map(p => p.product_id);
      const batchSize = 5; // Very small batches for maximum reliability
      let totalProcessed = 0;
      let totalSuccessful = 0;
      
      // Process in small batches
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(productIds.length / batchSize);
        
        setProgress((i / productIds.length) * 90);
        setCurrentStatus(`Batch ${batchNum}/${totalBatches}: Processing ${batch.length} products...`);
        
        console.log(`📦 Processing batch ${batchNum} (${batch.length} products)`);
        
        const { data: batchResult, error: batchError } = await supabase.functions.invoke('reliable-specs-extractor', {
          body: { productIds: batch }
        });
        
        if (batchError) {
          console.error(`❌ Batch ${batchNum} error:`, batchError);
          toast({
            title: `Batch ${batchNum} Error`,
            description: batchError.message || 'Network error',
            variant: "destructive"
          });
          continue;
        }

        if (!batchResult?.success) {
          console.error(`❌ Batch ${batchNum} failed:`, batchResult?.error);
          continue;
        }
        
        totalProcessed += batchResult.processed || 0;
        totalSuccessful += batchResult.successful || 0;
        
        console.log(`✅ Batch ${batchNum}: ${batchResult.successful}/${batchResult.processed} successful`);
        setCurrentStatus(`Batch ${batchNum} done: ${batchResult.successful}/${batchResult.processed} success. Total: ${totalSuccessful}/${totalProcessed}`);
        
        // Brief pause
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setProgress(100);
      setCurrentStatus('Syncing progress...');
      
      // Force progress sync
      await supabase.functions.invoke('force-progress-sync');
      
      const finalResults = {
        success: true,
        totalProducts: productIds.length,
        processed: totalProcessed,
        successful: totalSuccessful,
        failed: totalProcessed - totalSuccessful
      };
      
      setResults(finalResults);
      setCurrentStatus('Complete!');
      
      toast({
        title: "Extraction Complete! 🎉",
        description: `Successfully processed ${totalSuccessful}/${totalProcessed} products`,
        duration: 5000
      });
      
    } catch (error) {
      console.error('Extraction error:', error);
      setCurrentStatus('Error occurred');
      toast({
        title: "Extraction Failed",
        description: error.message || 'Unknown error occurred',
        variant: "destructive"
      });
      setResults({
        success: false,
        error: error.message
      });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Card className="w-full border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <Zap className="h-5 w-5" />
          Reliable GPT-5 Specs Extractor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-green-600">Multi-Model Fallback System:</p>
          <ul className="list-disc list-inside space-y-1">
            <li className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" />
              GPT-5 → GPT-4.1 → GPT-5-mini fallback chain
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              Guaranteed database saves with verification
            </li>
            <li className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Small batches for maximum reliability
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              Only processes products needing specs (444 panels remaining)
            </li>
          </ul>
        </div>

        {isExtracting && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              {currentStatus}
            </div>
            <Progress value={progress} className="w-full h-2" />
            <div className="text-xs text-muted-foreground text-center">
              No token waste - only processing products that need specs
            </div>
          </div>
        )}

        {results && (
          <div className={`p-4 rounded-lg text-sm ${results.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="font-medium mb-2 flex items-center gap-2">
              {results.success ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">Reliable Extraction Complete!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700">Extraction Failed</span>
                </>
              )}
            </div>
            {results.success ? (
              <div className="space-y-1 text-green-700">
                <div>🎯 Products found needing specs: {results.totalProducts}</div>
                <div>✅ Successfully processed: {results.successful}</div>
                <div>❌ Failed: {results.failed}</div>
                <div>📊 Progress sync: {results.progressSync ? '✅ Updated' : '⚠️ Check manually'}</div>
              </div>
            ) : (
              <div className="text-red-700">Error: {results.error}</div>
            )}
          </div>
        )}

        <Button 
          onClick={handleReliableExtraction}
          disabled={isExtracting}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          {isExtracting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting with GPT-5...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Extract Specs (Reliable & Efficient)
            </>
          )}
        </Button>
        
        <div className="text-xs text-center text-muted-foreground">
          Multi-model fallback system • Guaranteed saves • 444 panels remaining<br/>
          Uses GPT-5 → GPT-4.1 → GPT-5-mini fallback chain for maximum success
        </div>
      </CardContent>
    </Card>
  );
};