import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TestTube } from 'lucide-react';

export const SpecsExtractorTest = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testRPCFunction = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      console.log('🧪 Testing RPC function...');
      
      // Test the RPC function
      const { data: products, error: rpcError } = await supabase.rpc('get_products_needing_specs');
      
      if (rpcError) {
        throw new Error(`RPC Error: ${rpcError.message}`);
      }
      
      console.log(`📋 RPC Success: Found ${products?.length || 0} products needing specs`);
      
      if (!products || products.length === 0) {
        setResult({ 
          success: true, 
          message: 'All products already have 6+ specs!',
          products: 0 
        });
        return;
      }
      
      // Test specs-enhancer with first 5 products
      const testProducts = products.slice(0, 5).map(p => p.product_id);
      console.log('🚀 Testing specs-enhancer with 5 products:', testProducts);
      
      const { data: enhancerResult, error: enhancerError } = await supabase.functions.invoke('specs-enhancer', {
        body: { 
          action: 'enhance_list', 
          productIds: testProducts 
        }
      });
      
      if (enhancerError) {
        throw new Error(`Enhancer Error: ${enhancerError.message}`);
      }
      
      console.log('✅ Enhancer Result:', enhancerResult);
      
      setResult({
        success: true,
        productsFound: products.length,
        testResult: enhancerResult,
        message: `Found ${products.length} products needing specs. Test extraction: ${enhancerResult?.successful || 0}/${enhancerResult?.processed || 0} successful`
      });
      
      toast({
        title: "Test Complete!",
        description: `Found ${products.length} products. Test extraction: ${enhancerResult?.successful || 0} successful`,
      });
      
    } catch (error) {
      console.error('🚨 Test failed:', error);
      setResult({
        success: false,
        error: error.message,
        message: `Test failed: ${error.message}`
      });
      
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <TestTube className="h-5 w-5" />
          Specs Extraction Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>This tests the extraction system end-to-end:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>✅ Database RPC function (get products needing specs)</li>
            <li>🚀 Specs-enhancer edge function (process sample products)</li>
            <li>📊 Real progress tracking and results</li>
          </ul>
        </div>

        {result && (
          <div className={`p-4 rounded-lg text-sm ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="font-medium mb-2 flex items-center gap-2">
              {result.success ? (
                <>
                  <TestTube className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">Test Results</span>
                </>
              ) : (
                <span className="text-red-700">❌ Test Failed</span>
              )}
            </div>
            <div className={result.success ? 'text-green-700' : 'text-red-700'}>
              {result.success ? (
                <div className="space-y-1">
                  <div>📋 Products needing specs: {result.productsFound}</div>
                  <div>🧪 Test extraction: {result.testResult?.successful || 0}/{result.testResult?.processed || 0}</div>
                  <div>✅ System status: Ready for full extraction</div>
                </div>
              ) : (
                <div>Error: {result.error}</div>
              )}
            </div>
          </div>
        )}

        <Button 
          onClick={testRPCFunction}
          disabled={testing}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing System...
            </>
          ) : (
            <>
              <TestTube className="mr-2 h-4 w-4" />
              Test Specs Extraction System
            </>
          )}
        </Button>
        
        <div className="text-xs text-center text-muted-foreground">
          This runs the same logic as "Extract REAL Specs" but with only 5 products as a test
        </div>
      </CardContent>
    </Card>
  );
};