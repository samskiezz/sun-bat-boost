import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Download, FileText, Search, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ScrapingProgress {
  category: string;
  total_found: number;
  total_processed: number;
  total_with_pdfs: number;
  total_parsed: number;
  status: string;
}

interface ProductCounts {
  category: string;
  count: number;
  with_specs: number;
}

export default function ComprehensiveCatalogManager() {
  const [progress, setProgress] = useState<ScrapingProgress[]>([]);
  const [productCounts, setProductCounts] = useState<ProductCounts[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  async function loadStatus() {
    try {
      const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'status' }
      });

      if (error) throw error;

      setProgress(data.progress || []);
      setProductCounts(data.productCounts || []);
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  }

  async function handleOperation(action: string, category?: string) {
    setLoading(true);
    setActiveOperation(action);

    try {
      let confirmMessage = '';
      
      if (action === 'force_complete_reset') {
        confirmMessage = '⚠️ This will DELETE ALL products and regenerate from scratch. This cannot be undone. Are you sure?';
        if (!window.confirm(confirmMessage)) {
          setLoading(false);
          setActiveOperation('');
          return;
        }
      }
      
      const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action, category }
      });

      if (error) throw error;

      toast({
        title: "Operation Started",
        description: action === 'force_complete_reset' 
          ? 'Complete system reset initiated - this may take several minutes'
          : `${action} operation initiated successfully`,
      });

      // Refresh status after a delay
      setTimeout(loadStatus, 2000);

    } catch (error: any) {
      console.error(`Operation ${action} failed:`, error);
      toast({
        title: "Operation Failed",
        description: error.message || `Failed to execute ${action}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setActiveOperation(null);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Comprehensive Catalog Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Database className="h-4 w-4" />
            <AlertDescription>
              This system scrapes the entire CEC catalog, downloads all datasheets, parses specifications, 
              and builds a comprehensive product database with Google search fallback for missing data.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
            <Button 
              onClick={() => handleOperation('force_complete_reset')}
              disabled={loading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {activeOperation === 'force_complete_reset' ? 'Resetting...' : 'Complete Reset'}
            </Button>
            
            <Button 
              onClick={() => handleOperation('scrape_all')}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {activeOperation === 'scrape_all' ? 'Scraping...' : 'Scrape All Categories'}
            </Button>

            <Button 
              onClick={() => handleOperation('fetch_pdfs')}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {activeOperation === 'fetch_pdfs' ? 'Downloading...' : 'Fetch PDFs'}
            </Button>

            <Button 
              onClick={() => handleOperation('parse_specs')}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {activeOperation === 'parse_specs' ? 'Parsing...' : 'Parse Specifications'}
            </Button>

            <Button 
              onClick={loadStatus}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="progress">Scraping Progress</TabsTrigger>
          <TabsTrigger value="catalog">Product Catalog</TabsTrigger>
          <TabsTrigger value="individual">Individual Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          {progress.length > 0 ? (
            progress.map((item) => (
              <Card key={item.category}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{item.category.replace('_', ' ')}</h3>
                      {getStatusIcon(item.status)}
                    </div>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{item.total_found}</div>
                      <div className="text-sm text-muted-foreground">Found</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{item.total_processed}</div>
                      <div className="text-sm text-muted-foreground">Processed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{item.total_with_pdfs}</div>
                      <div className="text-sm text-muted-foreground">With PDFs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{item.total_parsed}</div>
                      <div className="text-sm text-muted-foreground">Parsed</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing Progress</span>
                      <span>{item.total_found > 0 ? Math.round((item.total_processed / item.total_found) * 100) : 0}%</span>
                    </div>
                    <Progress 
                      value={item.total_found > 0 ? (item.total_processed / item.total_found) * 100 : 0} 
                      className="h-2"
                    />
                  </div>

                  {item.total_processed > 0 && (
                    <div className="space-y-2 mt-3">
                      <div className="flex justify-between text-sm">
                        <span>PDF Collection</span>
                        <span>{Math.round((item.total_with_pdfs / item.total_processed) * 100)}%</span>
                      </div>
                      <Progress 
                        value={(item.total_with_pdfs / item.total_processed) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No scraping progress data available. Start by running "Scrape All Categories".</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {productCounts.map((category) => (
              <Card key={category.category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{category.category.replace('_', ' ')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Products:</span>
                      <span className="font-bold text-2xl">{category.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>With Specifications:</span>
                      <span className="font-bold text-lg text-green-600">{category.with_specs}</span>
                    </div>
                    <Progress 
                      value={category.count > 0 ? (category.with_specs / category.count) * 100 : 0}
                      className="h-2"
                    />
                    <div className="text-sm text-muted-foreground text-center">
                      {Math.round((category.with_specs / Math.max(category.count, 1)) * 100)}% Coverage
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {['PANEL', 'INVERTER', 'BATTERY_MODULE'].map((category) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category.replace('_', ' ')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => handleOperation('scrape_category', category)}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Scrape {category}
                  </Button>
                  
                  <Button 
                    onClick={() => handleOperation('fetch_pdfs', category)}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Fetch PDFs
                  </Button>
                  
                  <Button 
                    onClick={() => handleOperation('parse_specs', category)}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Parse Specs
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}