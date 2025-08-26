import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ExplainProps {
  reason: {
    productId: string;
    key: string;
    expected: any;
    actual: any;
    docSpanId?: string;
  };
  ruleCode: string;
}

interface DocSpan {
  id: string;
  productId: string;
  key: string;
  page: number;
  bbox?: { x: number; y: number; w: number; h: number };
  text: string;
}

export default function Explain({ reason, ruleCode }: ExplainProps) {
  const [docSpan, setDocSpan] = useState<DocSpan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reason.docSpanId || (reason.productId && reason.key)) {
      loadDocSpan();
    }
  }, [reason]);

  async function loadDocSpan() {
    setLoading(true);
    try {
      let query = supabase.from('doc_spans').select('*');
      
      if (reason.docSpanId) {
        query = query.eq('id', reason.docSpanId);
      } else {
        query = query.eq('product_id', reason.productId).eq('key', reason.key);
      }
      
      const { data } = await query.single();
      
      if (data) {
        setDocSpan({
          id: data.id,
          productId: data.product_id,
          key: data.key,
          page: data.page,
          bbox: data.bbox,
          text: data.text
        });
      }
    } catch (error) {
      console.error('Failed to load doc span:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="w-5 h-5" />
          Why This Choice Is Blocked
          <Badge variant="outline" className="ml-auto">
            {ruleCode}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-amber-700">Expected:</span>
            <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
              {formatValue(reason.expected)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-amber-700">Actual:</span>
            <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
              {formatValue(reason.actual)}
            </span>
          </div>
        </div>

        {docSpan && !loading && (
          <div className="border-t border-amber-200 pt-3">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-amber-600 mt-1" />
              <div className="flex-1">
                <div className="text-sm font-medium text-amber-800 mb-1">
                  Specification Reference:
                </div>
                <div className="text-sm text-amber-700 bg-white p-2 rounded border">
                  "{docSpan.text}"
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-amber-600">
                  <span>Page {docSpan.page}</span>
                  <span>Key: {docSpan.key}</span>
                  {docSpan.bbox && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View in Datasheet
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="border-t border-amber-200 pt-3">
            <div className="text-sm text-amber-600">Loading specification reference...</div>
          </div>
        )}

        <div className="border-t border-amber-200 pt-3">
          <div className="text-xs text-amber-600">
            This constraint prevents invalid system configurations and ensures compliance with manufacturer specifications and Australian standards.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatValue(value: any): string {
  if (typeof value === 'object' && value !== null) {
    if (value.min !== undefined && value.max !== undefined) {
      return `${value.min}–${value.max}`;
    }
    return JSON.stringify(value);
  }
  
  return String(value);
}