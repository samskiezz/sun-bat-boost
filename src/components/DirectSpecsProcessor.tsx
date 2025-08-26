import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { processProductsDirectly } from '@/utils/directSpecsProcessor';
import { Loader2, Zap, CheckCircle } from 'lucide-react';

export const DirectSpecsProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleDirectProcessing = async () => {
    setIsProcessing(true);
    setProgress(0);
    setResult(null);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await processProductsDirectly();
      
      clearInterval(progressInterval);
      setProgress(100);
      setResult(result);
      
      if (result.success) {
        toast({
          title: "Direct Processing Successful",
          description: `Processed ${result.processed} products with comprehensive specs`,
          duration: 5000,
        });
      } else {
        toast({
          title: "Processing Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error in direct processing:', error);
      toast({
        title: "Error",
        description: "Failed to run direct specs processing",
        variant: "destructive",
        duration: 5000,
      });
      setResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <Zap className="h-5 w-5" />
          Direct Specs Processor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">This bypasses the complex orchestration and directly processes products that need comprehensive specs:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>✅ Focuses only on CEC products with PDFs</li>
            <li>⚡ Generates 6+ comprehensive specs per product</li>
            <li>🎯 Updates readiness gates immediately</li>
            <li>🔧 Simple, direct approach without complex fallbacks</li>
          </ul>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing products directly...
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {result && (
          <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className="flex items-center gap-2 font-medium mb-1">
              {result.success ? <CheckCircle className="h-4 w-4" /> : '❌'}
              {result.success ? 'Success!' : 'Failed'}
            </div>
            {result.success ? (
              <div>Processed {result.processed} products with comprehensive specs</div>
            ) : (
              <div>Error: {result.error}</div>
            )}
          </div>
        )}

        <Button 
          onClick={handleDirectProcessing}
          disabled={isProcessing}
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Fix Specs Directly (Bypass Complex System)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};