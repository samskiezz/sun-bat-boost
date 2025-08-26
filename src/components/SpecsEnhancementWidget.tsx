import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, FileText, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SpecsEnhancementWidget() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  async function enhanceSpecs() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('specs-enhancer', {
        body: { action: 'full_enhancement' }
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Specs Enhanced",
        description: `Enhanced ${data.specs_result?.enhanced_count || 0} products, processed ${data.pdf_result?.processed_count || 0} PDFs`,
      });

    } catch (error) {
      console.error('❌ Specs enhancement failed:', error);
      toast({
        title: "Enhancement Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
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
        
        <Button
          onClick={enhanceSpecs}
          disabled={loading}
          size="sm"
          className="w-full"
        >
          <Zap className="w-3 h-3 mr-2" />
          {loading ? 'Enhancing...' : 'Enhance AI/ML Data'}
        </Button>

        {result && (
          <div className="space-y-2 text-xs">
            <div className="bg-green-50 p-2 rounded">
              ✅ Specs Enhanced: {result.specs_result?.enhanced_count || 0} products
            </div>
            <div className="bg-blue-50 p-2 rounded">
              📄 PDFs Generated: {result.pdf_result?.processed_count || 0} files
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