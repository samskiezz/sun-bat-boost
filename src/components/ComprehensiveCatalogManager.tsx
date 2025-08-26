import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
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
  total_count: number;
  active_count: number;
  with_datasheet_count: number;
  with_pdf_count: number;
}

export default function ComprehensiveCatalogManager() {
  const [progress, setProgress] = useState<ScrapingProgress[]>([]);
  const [productCounts, setProductCounts] = useState<ProductCounts[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStatus();
    
    // Set up real-time polling every 2 seconds
    const interval = setInterval(() => {
      loadStatus();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Update processing state when progress changes
  useEffect(() => {
    const hasProcessing = progress.some(p => 
      p.status === 'processing' || p.status === 'clearing'
    );
    setIsProcessing(hasProcessing);
  }, [progress]);

  async function loadStatus() {
    try {
      console.log('🔄 UI: Loading status...');
      const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'status' }
      });

      console.log('📊 UI: Status response:', { data, error });

      if (error) throw error;

      console.log(`📋 UI: Found ${data.progress?.length || 0} categories:`, data.progress?.map(p => p.category));
      setProgress(data.progress || []);
      setProductCounts(data.productCounts || []);
    } catch (error) {
      console.error('❌ UI: Failed to load status:', error);
    }
  }

  async function handleOperation(action: string) {
    console.log(`🚀 UI: Starting operation: ${action}`);
    setLoading(true);

    try {
      if (action === 'force_complete_reset') {
        const confirmed = window.confirm(
          '⚠️ This will DELETE ALL products and regenerate from scratch. This cannot be undone. Are you sure?'
        );
        if (!confirmed) {
          setLoading(false);
          return;
        }
      }
      
      console.log(`📡 UI: Calling edge function with action: ${action}`);
      const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action }
      });

      console.log(`📡 UI: Edge function response:`, { data, error });

      if (error) {
        console.error('❌ UI: Edge function error:', error);
        throw error;
      }

      if (data?.status === 'already_running') {
        console.log('⚠️ UI: Operation already running');
        toast({
          title: "Already Running",
          description: "Operation is already in progress. Please wait.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ UI: Operation started successfully');
      toast({
        title: "Operation Started",
        description: action === 'force_complete_reset' 
          ? 'Complete system reset initiated - this may take several minutes'
          : 'Scraping operation initiated successfully',
      });

      // Force immediate status refresh
      console.log('🔄 UI: Forcing immediate status refresh...');
      setTimeout(() => {
        loadStatus();
      }, 500);

    } catch (error: any) {
      console.error(`❌ UI: Operation ${action} failed:`, error);
      toast({
        title: "Operation Failed",
        description: error.message || `Failed to execute ${action}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'clearing':
        return <RefreshCw className="w-4 h-4 text-orange-600 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
      case 'clearing':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-300';
    }
  };

  const getProgressPercentage = (item: ScrapingProgress) => {
    if (item.total_found === 0) return 0;
    return Math.round((item.total_processed / item.total_found) * 100);
  };

  const getCategoryDisplayName = (category: string) => {
    return category.replace('_', ' ').replace('MODULE', '');
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
              and builds a comprehensive product database. Target: 1,348 panels, 513 batteries, 200 inverters.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Button 
              onClick={() => {
                console.log('🖱️ UI: Start Scraping button clicked');
                handleOperation('scrape_all');
              }}
              disabled={loading || isProcessing}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Database className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Starting...' : isProcessing ? 'Processing...' : 'Start Scraping'}
            </Button>
            
            <Button 
              onClick={() => {
                console.log('🖱️ UI: Complete Reset button clicked');
                handleOperation('force_complete_reset');
              }}
              disabled={loading || isProcessing}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <AlertTriangle className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Resetting...' : 'Complete Reset'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="progress">Scraping Progress</TabsTrigger>
          <TabsTrigger value="catalog">Product Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                CEC Catalog Scraping
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Generate comprehensive product data from the Clean Energy Council database with complete specifications and 100% PDF coverage.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {progress.length > 0 ? (
                progress.map((item) => (
                  <div key={item.category} className="space-y-4 p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        {getCategoryDisplayName(item.category)}
                        {getStatusIcon(item.status)}
                      </h3>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{item.total_found}</div>
                        <div className="text-xs text-muted-foreground">Found</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{item.total_processed}</div>
                        <div className="text-xs text-muted-foreground">Processed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{item.total_with_pdfs}</div>
                        <div className="text-xs text-muted-foreground">PDFs</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">{item.total_parsed}</div>
                        <div className="text-xs text-muted-foreground">Parsed</div>
                      </div>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Processing Progress</span>
                        <span className="font-mono">{getProgressPercentage(item)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            item.status === 'processing' ? 'bg-blue-500 animate-pulse' : 
                            item.status === 'completed' ? 'bg-green-500' : 
                            item.status === 'clearing' ? 'bg-orange-500 animate-pulse' :
                            'bg-gray-400'
                          }`}
                          style={{ 
                            width: `${getProgressPercentage(item)}%`,
                            minWidth: item.status === 'processing' || item.status === 'clearing' ? '2%' : '0%'
                          }}
                        />
                      </div>
                    </div>

                    {/* Real-time status messages */}
                    {item.status === 'processing' && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>Processing {getCategoryDisplayName(item.category).toLowerCase()}s... {item.total_processed}/{item.total_found}</span>
                      </div>
                    )}
                    
                    {item.status === 'clearing' && (
                      <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-950 p-3 rounded-md">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Clearing existing data...</span>
                      </div>
                    )}
                    
                    {item.status === 'completed' && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-md">
                        <CheckCircle className="w-4 h-4" />
                        <span>Complete - {item.total_processed} products with {item.total_with_pdfs} PDFs</span>
                      </div>
                    )}
                    
                    {item.status === 'failed' && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                        <XCircle className="w-4 h-4" />
                        <span>Processing failed - check logs for details</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Progress Data</h3>
                  <p className="text-sm mb-4">Click "Start Scraping" to begin the data collection process.</p>
                  <Button 
                    onClick={() => handleOperation('scrape_all')}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Start Scraping
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {productCounts.map((category) => (
              <Card key={category.category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{getCategoryDisplayName(category.category)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Products:</span>
                      <span className="font-bold text-2xl">{category.total_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>With PDFs:</span>
                      <span className="font-bold text-lg text-green-600">{category.with_pdf_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>With Datasheets:</span>
                      <span className="font-bold text-lg text-blue-600">{category.with_datasheet_count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-green-500 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${category.total_count > 0 ? (category.with_pdf_count / category.total_count) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      {Math.round((category.with_pdf_count / Math.max(category.total_count, 1)) * 100)}% PDF Coverage
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {productCounts.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No product data available. Start scraping to generate the catalog.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}