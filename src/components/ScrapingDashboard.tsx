import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Search, Database, AlertTriangle, CheckCircle, Clock, Zap, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { forceCompleteReset } from '@/utils/forceCompleteReset';

interface ScrapeProgress {
  category: string;
  total_found: number;
  total_processed: number;
  total_with_pdfs: number;
  total_parsed: number;
  status: string;
}

interface SystemStats {
  totalProducts: number;
  totalManufacturers: number;
  totalSpecs: number;
  totalWithPDFs: number;
  coverageByCategory: Record<string, number>;
}

export default function ScrapingDashboard() {
  const [progress, setProgress] = useState<ScrapeProgress[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    loadProgress();
    loadStats();
    
    // Check if any operations are currently running on mount
    const checkRunningOperations = async () => {
      try {
        const { data } = await supabase
          .from('scrape_progress')
          .select('*')
          .in('status', ['processing', 'clearing']);
          
        if (data && data.length > 0) {
          setIsRunning(true);
          const activeCategory = data.find(p => p.status === 'processing' || p.status === 'clearing');
          if (activeCategory) {
            setCurrentOperation(`Resuming ${activeCategory.category.toLowerCase()} processing...`);
          }
        }
      } catch (error) {
        console.error('Failed to check running operations:', error);
      }
    };
    
    checkRunningOperations();
    
    // Set up real-time polling every 2 seconds
    const intervalId = setInterval(async () => {
      await loadProgress();
      
      // Check if operations are still running
      const activeProcessing = progress.some(p => p.status === 'processing' || p.status === 'clearing');
      if (!activeProcessing && isRunning) {
        setIsRunning(false);
        setCurrentOperation('');
        await loadStats();
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  // Separate effect for handling progress updates
  useEffect(() => {
    if (progress.length > 0 && isRunning) {
      const activeCategory = progress.find(p => p.status === 'processing' || p.status === 'clearing');
      if (activeCategory) {
        const statusText = activeCategory.status === 'clearing' ? 'Clearing' : 'Processing';
        const progressText = activeCategory.total_found > 0 ? 
          `${activeCategory.total_processed}/${activeCategory.total_found} (${Math.round((activeCategory.total_processed / activeCategory.total_found) * 100)}%)` : 
          'initializing...';
        setCurrentOperation(`${statusText} ${activeCategory.category.toLowerCase().replace('_', ' ')}s: ${progressText}`);
      }
    }
  }, [progress, isRunning]);

  async function loadProgress() {
    try {
      const { data } = await supabase
        .from('scrape_progress')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setProgress(data);
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  }

  async function loadStats() {
    try {
      const [productsRes, manufacturersRes, specsRes] = await Promise.all([
        supabase.from('products').select('id, category, pdf_path', { count: 'exact', head: true }),
        supabase.from('manufacturers').select('id', { count: 'exact', head: true }),
        supabase.from('specs').select('id', { count: 'exact', head: true })
      ]);

      const { data: products } = await supabase
        .from('products')
        .select('category, pdf_path');

      const coverageByCategory: Record<string, number> = {};
      let totalWithPDFs = 0;

      if (products) {
        const categoryGroups = products.reduce((acc, product) => {
          if (!acc[product.category]) acc[product.category] = { total: 0, withPDFs: 0 };
          acc[product.category].total++;
          if (product.pdf_path) {
            acc[product.category].withPDFs++;
            totalWithPDFs++;
          }
          return acc;
        }, {} as Record<string, { total: number; withPDFs: number }>);

        Object.entries(categoryGroups).forEach(([category, data]) => {
          coverageByCategory[category] = data.total > 0 ? (data.withPDFs / data.total) * 100 : 0;
        });
      }

      setStats({
        totalProducts: productsRes.count || 0,
        totalManufacturers: manufacturersRes.count || 0,
        totalSpecs: specsRes.count || 0,
        totalWithPDFs,
        coverageByCategory
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  }

  async function runFullScrape() {
    if (isRunning) {
      addLog('⚠️ Scraping already in progress');
      return;
    }
    
    setIsRunning(true);
    setLogs([]);
    addLog('🚀 Starting comprehensive CEC scrape...');
    setCurrentOperation('Initializing scrape process...');

    try {
      // Start the background scraping process
      const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'scrape_all' }
      });

      if (error) throw error;
      
      if (data?.status === 'already_running') {
        addLog('⚠️ Scraping already in progress - please wait');
        setIsRunning(false);
        setCurrentOperation('');
        return;
      }

      addLog('✅ Scraping process started in background');
      addLog('📊 Monitoring all categories: PANELS, BATTERIES, INVERTERS');
      
      // Don't set up additional polling here - let the useEffect handle it
      
    } catch (error) {
      console.error('Scraping failed:', error);
      addLog(`❌ Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsRunning(false);
      setCurrentOperation('');
    }
  }

  async function runCompleteReset() {
    if (isRunning) {
      addLog('⚠️ Reset already in progress');
      return;
    }
    
    setIsRunning(true);
    setCurrentOperation('Starting complete system reset...');
    addLog('🔄 Starting complete system reset...');

    try {
      // Start the background reset process
      const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'force_complete_reset' }
      });

      if (error) throw error;
      
      if (data?.status === 'already_running') {
        addLog('⚠️ Reset already in progress - please wait');
        setIsRunning(false);
        setCurrentOperation('');
        return;
      }

      addLog('✅ Reset process started in background');
      addLog('📊 Will generate exactly: 1348 panels, 513 batteries, 200 inverters');
      
      // Don't set up additional polling here - let the useEffect handle it
      
    } catch (error) {
      console.error('Reset failed:', error);
      addLog(`❌ Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsRunning(false);
      setCurrentOperation('');
    }
  }

  async function runStatusRefresh() {
    setIsRunning(true);
    setCurrentOperation('Refreshing status');
    addLog('🔄 Refreshing system status...');

    try {
      await loadProgress();
      await loadStats();
      
      addLog('✅ Status refreshed successfully');

    } catch (error) {
      console.error('Status refresh failed:', error);
      addLog(`❌ Status refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
      setCurrentOperation('');
    }
  }

  const getProgressPercentage = (item: ScrapeProgress) => {
    if (item.total_found === 0) return 0;
    return Math.round((item.total_with_pdfs / item.total_found) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'running': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            CEC Catalog & Spec Sheet Database
          </h2>
          <p className="text-muted-foreground">
            Comprehensive solar equipment database with 50,000+ training episodes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={runFullScrape}
            disabled={isRunning}
            variant="default"
            className="flex items-center gap-2"
          >
            {isRunning && currentOperation.includes('Scraping') ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Scrape All Categories
              </>
            )}
          </Button>

          <Button
            onClick={runCompleteReset}
            disabled={isRunning}
            variant="destructive"
            className="flex items-center gap-2"
          >
            {isRunning && currentOperation.includes('reset') ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                Complete Reset
              </>
            )}
          </Button>
        </div>
      </div>

      {/* System Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts.toLocaleString() || 0}</div>
            <div className="text-xs text-muted-foreground">
              Across {stats?.totalManufacturers || 0} manufacturers
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">With Datasheets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalWithPDFs.toLocaleString() || 0}</div>
            <div className="text-xs text-muted-foreground">
              {stats?.totalProducts ? Math.round((stats.totalWithPDFs / stats.totalProducts) * 100) : 0}% coverage
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Specs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSpecs.toLocaleString() || 0}</div>
            <div className="text-xs text-muted-foreground">
              Parsed specifications
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Training Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {stats?.totalSpecs && stats?.totalSpecs > 10000 ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Clock className="w-6 h-6 text-yellow-500" />
              )}
              {stats?.totalSpecs && stats?.totalSpecs > 10000 ? 'Ready' : 'Building...'}
            </div>
            <div className="text-xs text-muted-foreground">
              For 50k training episodes
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">Scrape Progress</TabsTrigger>
          <TabsTrigger value="coverage">Coverage by Category</TabsTrigger>
          <TabsTrigger value="logs">Live Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          {progress.length > 0 ? (
            progress.map((item) => (
              <Card key={item.category}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {item.category === 'PANEL' && <Zap className="w-5 h-5" />}
                      {item.category === 'INVERTER' && <Database className="w-5 h-5" />}
                      {item.category === 'BATTERY_MODULE' && <CheckCircle className="w-5 h-5" />}
                      {item.category.replace('_', ' ')}
                    </CardTitle>
                    <Badge variant={getStatusColor(item.status)}>
                      {item.status === 'processing' && <Clock className="w-3 h-3 mr-1 animate-spin" />}
                      {item.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-2xl text-blue-600">{item.total_found.toLocaleString()}</div>
                      <div className="text-muted-foreground text-xs">Target</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-2xl text-green-600">{item.total_processed.toLocaleString()}</div>
                      <div className="text-muted-foreground text-xs">Processed</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-2xl text-purple-600">{item.total_with_pdfs.toLocaleString()}</div>
                      <div className="text-muted-foreground text-xs">With PDFs</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-2xl text-orange-600">{item.total_parsed.toLocaleString()}</div>
                      <div className="text-muted-foreground text-xs">Specs Parsed</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing Progress</span>
                      <span className="font-mono">
                        {item.total_found > 0 ? Math.round((item.total_processed / item.total_found) * 100) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={item.total_found > 0 ? (item.total_processed / item.total_found) * 100 : 0} 
                      className="h-3"
                    />
                  </div>

                  {item.total_processed > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>PDF Coverage</span>
                        <span className="font-mono">
                          {Math.round((item.total_with_pdfs / item.total_processed) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={(item.total_with_pdfs / item.total_processed) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}
                  
                  {/* Real-time status indicators */}
                  {item.status === 'processing' && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950 p-2 rounded-md">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Processing {item.category.toLowerCase().replace('_', ' ')}s... {item.total_processed}/{item.total_found}</span>
                    </div>
                  )}
                  
                  {item.status === 'clearing' && (
                    <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-950 p-2 rounded-md">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Clearing existing data...</span>
                    </div>
                  )}
                  
                  {item.status === 'completed' && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded-md">
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete - {item.total_processed} products with {item.total_with_pdfs} PDFs</span>
                    </div>
                  )}
                  
                  {item.status === 'failed' && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded-md">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Processing failed - check logs</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No scraping progress data available.</p>
                <p className="text-sm">Click "Scrape All Categories" or "Complete Reset" to start.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="coverage" className="space-y-4">
          {stats?.coverageByCategory && Object.entries(stats.coverageByCategory).map(([category, percentage]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle>{category.replace('_', ' ')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Datasheet Coverage</span>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={percentage} />
                  <div className="text-xs text-muted-foreground">
                    {percentage >= 90 ? '✅ Excellent coverage' : 
                     percentage >= 70 ? '⚠️ Good coverage' : 
                     '❌ Needs improvement'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Live Processing Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isRunning && currentOperation && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span className="font-medium">Current Operation:</span>
                    <span>{currentOperation}</span>
                  </div>
                </div>
              )}
              
              <div className="max-h-96 overflow-y-auto space-y-1">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">
                    No logs yet. Start a scraping operation to see live updates.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-sm font-mono p-2 bg-gray-50 rounded">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}