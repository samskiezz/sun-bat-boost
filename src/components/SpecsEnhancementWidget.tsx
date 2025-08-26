import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, FileText, Zap, RotateCcw, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SpecsEnhancementWidget() {
  const [loading, setLoading] = useState(false);
  const [webLoading, setWebLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [webResult, setWebResult] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const { toast } = useToast();

  // Poll for progress updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading || webLoading) {
      interval = setInterval(async () => {
        try {
          const { data } = await supabase.functions.invoke('cec-comprehensive-scraper', {
            body: { action: 'status' }
          });
          if (data?.success && data?.progress) {
            setProgress(data.progress);
          }
        } catch (error) {
          console.error('Status check failed:', error);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, webLoading]);

  async function enhanceSpecs() {
    setLoading(true);
    setResult(null);
    setProgress(null);
    
    try {
      // Start with a small batch to test
      const { data, error } = await supabase.functions.invoke('specs-enhancer', {
        body: { action: 'full_enhancement', batchSize: 50, offset: 0 }
      });

      if (error) throw error;

      if (data?.success) {
        setResult(data);
        toast({
          title: "Specs Enhancement Started",
          description: `Processing ${data.enhanced_count || 0} products with AI + Web fallback`,
        });
        
        // Continue processing in batches
        if (!data.completed && data.next_offset) {
          continueBatchProcessing(data.next_offset);
        }
      } else {
        throw new Error(data?.error || 'Unknown error');
      }

    } catch (error) {
      console.error('❌ Specs enhancement failed:', error);
      toast({
        title: "Enhancement Failed", 
        description: (error as Error).message,
        variant: "destructive"
      });
      setLoading(false);
    }
  }

  async function webScrapeEnhance() {
    setWebLoading(true);
    setWebResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-web-scraper', {
        body: { action: 'batch_enhance', batchSize: 20, offset: 0 }
      });

      if (error) throw error;

      if (data?.success) {
        setWebResult(data);
        toast({
          title: "Web Scraping Started",
          description: `Enhanced ${data.enhanced_count || 0} products from web sources`,
        });
        
        // Continue processing if needed
        if (!data.completed && data.next_offset) {
          continueWebProcessing(data.next_offset);
        }
      } else {
        throw new Error(data?.error || 'Web scraping failed');
      }

    } catch (error) {
      console.error('❌ Web scraping failed:', error);
      toast({
        title: "Web Scraping Failed", 
        description: (error as Error).message,
        variant: "destructive"
      });
      setWebLoading(false);
    }
  }

  async function continueWebProcessing(offset: number) {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-web-scraper', {
        body: { action: 'batch_enhance', batchSize: 20, offset }
      });

      if (error) throw error;

      if (data?.success) {
        setWebResult(prev => ({
          ...prev,
          enhanced_count: (prev?.enhanced_count || 0) + (data.enhanced_count || 0)
        }));

        if (!data.completed && data.next_offset) {
          setTimeout(() => continueWebProcessing(data.next_offset), 2000);
        } else {
          setWebLoading(false);
          toast({
            title: "Web Scraping Complete",
            description: `Total enhanced: ${(webResult?.enhanced_count || 0) + (data.enhanced_count || 0)} products`,
          });
        }
      }
    } catch (error) {
      console.error('Web processing error:', error);
      setWebLoading(false);
    }
  }

  async function continueBatchProcessing(offset: number) {
    try {
      const { data, error } = await supabase.functions.invoke('specs-enhancer', {
        body: { action: 'full_enhancement', batchSize: 50, offset }
      });

      if (error) throw error;

      if (data?.success) {
        setResult(prev => ({
          ...prev,
          enhanced_count: (prev?.enhanced_count || 0) + (data.enhanced_count || 0)
        }));

        if (!data.completed && data.next_offset) {
          // Continue with next batch after a short delay
          setTimeout(() => continueBatchProcessing(data.next_offset), 1000);
        } else {
          // All done
          setLoading(false);
          toast({
            title: "Enhancement Complete",
            description: `Total enhanced: ${(result?.enhanced_count || 0) + (data.enhanced_count || 0)} products`,
          });
        }
      }
    } catch (error) {
      console.error('Batch processing error:', error);
      setLoading(false);
    }
  }

  async function resetAndRestart() {
    setLoading(true);
    try {
      // Reset readiness gates first
      await supabase.from('readiness_gates')
        .update({ current_value: 0, passing: false })
        .in('gate_name', ['G3_PANEL_SPECS', 'G3_BATTERY_SPECS', 'G3_INVERTER_SPECS']);

      // Then start enhancement
      await enhanceSpecs();
      
    } catch (error) {
      console.error('Reset failed:', error);
      toast({
        title: "Reset Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5" />
          AI/ML Data Enhancement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Extract specs using AI + Web scraping fallbacks from manufacturer websites
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={enhanceSpecs}
            disabled={loading || webLoading}
            size="sm"
          >
            <Zap className="w-3 h-3 mr-2" />
            {loading ? 'AI Extracting...' : 'AI + Web Extract'}
          </Button>
          
          <Button
            onClick={webScrapeEnhance}
            disabled={loading || webLoading}
            size="sm"
            variant="outline"
          >
            <Globe className="w-3 h-3 mr-2" />
            {webLoading ? 'Web Scraping...' : 'Web Only'}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={resetAndRestart}
            disabled={loading || webLoading}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <RotateCcw className="w-3 h-3 mr-2" />
            Reset & Start Over
          </Button>
        </div>

        {progress && (
          <div className="space-y-2 text-xs">
            <div className="font-medium text-blue-600">Current Progress:</div>
            {progress.map((p: any) => (
              <div key={p.category} className="bg-blue-50 p-2 rounded">
                {p.category}: {p.specs_done}/{p.target} specs ({Math.round(p.specs_done/p.target*100)}%)
              </div>
            ))}
          </div>
        )}

        {result && (
          <div className="space-y-2 text-xs">
            <div className="bg-green-50 p-2 rounded">
              ✅ AI Enhanced: {result.enhanced_count || 0} products
            </div>
          </div>
        )}

        {webResult && (
          <div className="space-y-2 text-xs">
            <div className="bg-blue-50 p-2 rounded">
              🌐 Web Scraped: {webResult.enhanced_count || 0} products
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t pt-3">
          <div className="font-medium mb-2">Multi-Source Extraction:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="font-medium">AI Extraction</div>
              <ul className="space-y-1 mt-1">
                <li>• PDF datasheet analysis</li>
                <li>• CEC raw data parsing</li>
                <li>• Web fallback if needed</li>
              </ul>
            </div>
            <div>
              <div className="font-medium">Web Scraping</div>
              <ul className="space-y-1 mt-1">
                <li>• Google Search API</li>
                <li>• Manufacturer websites</li>
                <li>• Solar industry sources</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}