import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Search, Database, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CECScraper } from '@/lib/cec-scraper';
import { PDFProcessor } from '@/lib/pdf-processor';
import { GoogleFallbackScraper } from '@/lib/google-fallback';

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
    const interval = setInterval(() => {
      if (isRunning) {
        loadProgress();
        loadStats();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isRunning]);

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
    setIsRunning(true);
    setLogs([]);
    addLog('🚀 Starting comprehensive CEC scrape...');

    try {
      const scraper = new CECScraper();
      const categories: Array<'PANEL' | 'INVERTER' | 'BATTERY_MODULE'> = ['PANEL', 'INVERTER', 'BATTERY_MODULE'];

      for (const category of categories) {
        setCurrentOperation(`Scraping ${category} products`);
        addLog(`🔍 Scraping CEC ${category} products...`);

        const result = await scraper.scrapeCategory(category);
        await scraper.saveProducts(result.products);
        await scraper.updateScrapeProgress(category, result);

        addLog(`✅ Found and saved ${result.totalFound} ${category} products`);
      }

      addLog('🎯 CEC scraping completed successfully');
      await loadProgress();
      await loadStats();

    } catch (error) {
      console.error('Scraping failed:', error);
      addLog(`❌ Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
      setCurrentOperation('');
    }
  }

  async function runPDFDownload() {
    setIsRunning(true);
    setCurrentOperation('Downloading and processing PDFs');
    addLog('📄 Starting PDF download and processing...');

    try {
      const processor = new PDFProcessor();
      await processor.processAllPendingPDFs();
      
      addLog('✅ PDF processing completed');
      await loadStats();

    } catch (error) {
      console.error('PDF processing failed:', error);
      addLog(`❌ PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
      setCurrentOperation('');
    }
  }

  async function runGoogleFallback() {
    setIsRunning(true);
    setCurrentOperation('Searching for missing datasheets with Google');
    addLog('🔎 Starting Google fallback search...');

    try {
      const googleScraper = new GoogleFallbackScraper();
      await googleScraper.findMissingDatasheets();
      
      addLog('✅ Google fallback search completed');
      await loadStats();

    } catch (error) {
      console.error('Google fallback failed:', error);
      addLog(`❌ Google fallback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          >
            <Search className="w-4 h-4 mr-2" />
            {isRunning && currentOperation.includes('Scraping') ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Scraping...
              </>
            ) : (
              'Scrape CEC'
            )}
          </Button>

          <Button
            onClick={runPDFDownload}
            disabled={isRunning}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Process PDFs
          </Button>

          <Button
            onClick={runGoogleFallback}
            disabled={isRunning}
            variant="outline"
          >
            <Search className="w-4 h-4 mr-2" />
            Google Fallback
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
          {progress.map((item) => (
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
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium">{item.total_found.toLocaleString()}</div>
                    <div className="text-muted-foreground">Products Found</div>
                  </div>
                  <div>
                    <div className="font-medium">{item.total_with_pdfs.toLocaleString()}</div>
                    <div className="text-muted-foreground">With PDFs</div>
                  </div>
                  <div>
                    <div className="font-medium">{item.total_parsed.toLocaleString()}</div>
                    <div className="text-muted-foreground">Specs Parsed</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>PDF Coverage</span>
                    <span>{getProgressPercentage(item)}%</span>
                  </div>
                  <Progress value={getProgressPercentage(item)} />
                </div>
              </CardContent>
            </Card>
          ))}
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