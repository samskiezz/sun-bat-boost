import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, FileText, Zap, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SpecsEnhancementWidget() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const { toast } = useToast();

  // Poll for progress updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
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
  }, [loading]);

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
          description: `Processing ${data.enhanced_count || 0} products in batches`,
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
          Enhance product specs for AI compatibility and generate missing PDFs
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={enhanceSpecs}
            disabled={loading}
            size="sm"
            className="flex-1"
          >
            <Zap className="w-3 h-3 mr-2" />
            {loading ? 'Enhancing...' : 'Enhance Specs'}
          </Button>
          
          <Button
            onClick={resetAndRestart}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>

        {progress && (
          <div className="space-y-2 text-xs">
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
              ✅ Enhanced: {result.enhanced_count || 0} products
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <div className="font-medium mb-1">AI Systems Require:</div>
          <ul className="space-y-1">
            <li>• product.specs.watts (panels)</li>
            <li>• product.specs.kWh (batteries)</li>
            <li>• product.power_rating (inverters)</li>
            <li>• PDF paths for document processing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}