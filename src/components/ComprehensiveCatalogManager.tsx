import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useReadinessGates } from '@/lib/readiness-gates';

interface ScrapeJob {
  id: string;
  status: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

interface JobProgress {
  job_id: string;
  category: string;
  target: number;
  processed: number;
  specs_done: number;
  pdf_done: number;
  state: string;
}

interface ProductCounts {
  category: string;
  total_count: number;
  active_count: number;
  with_datasheet_count: number;
  with_pdf_count: number;
}

export default function ComprehensiveCatalogManager() {
  const [job, setJob] = useState<ScrapeJob | null>(null);
  const [progress, setProgress] = useState<JobProgress[]>([]);
  const [productCounts, setProductCounts] = useState<ProductCounts[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const { toast } = useToast();
  const { status: readinessStatus, loading: readinessLoading } = useReadinessGates();

  useEffect(() => {
    // Load job ID from localStorage on mount
    const savedJobId = localStorage.getItem('scrape_job_id');
    if (savedJobId) {
      setJobId(savedJobId);
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;
    
    loadStatus();
    
    // Set up polling for running jobs
    const interval = setInterval(() => {
      loadStatus();
      // Auto-tick if job is running
      if (job?.status === 'running') {
        tickJob();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  async function loadStatus() {
    if (!jobId) return;
    
    try {
      console.log('🔄 UI: Loading job status...');
      const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'status' }
      });

      console.log('📊 UI: Status response:', { data, error });

      if (error) throw error;

      setJob(data.job);
      setProgress(data.progress || []);
      setProductCounts(data.productCounts || []);
    } catch (error) {
      console.error('❌ UI: Failed to load status:', error);
    }
  }

  async function tickJob() {
    if (!jobId || job?.status !== 'running') return;
    
    try {
      await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'tick' }
      });
    } catch (error) {
      console.error('❌ UI: Failed to tick job:', error);
    }
  }

  async function startJob() {
    console.log('🚀 UI: Starting scraping job...');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'start' }
      });

      if (error) throw error;

      const newJobId = data.job_id;
      setJobId(newJobId);
      localStorage.setItem('scrape_job_id', newJobId);

      toast({
        title: "Job Started",
        description: "Comprehensive scraping job initiated successfully",
      });

      // Start loading status immediately
      setTimeout(loadStatus, 500);

    } catch (error: any) {
      console.error('❌ UI: Start job failed:', error);
      toast({
        title: "Operation Failed",
        description: error.message || 'Failed to start scraping job',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function resetJobs() {
    const confirmed = window.confirm(
      '⚠️ This will cancel all jobs and clear data. Are you sure?'
    );
    if (!confirmed) return;

    console.log('🚀 UI: Resetting jobs...');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'reset' }
      });

      if (error) throw error;

      // Clear local state
      setJobId(null);
      setJob(null);
      setProgress([]);
      localStorage.removeItem('scrape_job_id');

      toast({
        title: "Reset Complete",
        description: "All jobs and data have been reset",
      });

    } catch (error: any) {
      console.error('❌ UI: Reset failed:', error);
      toast({
        title: "Reset Failed",
        description: error.message || 'Failed to reset jobs',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-300';
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((current / target) * 100);
  };

  const getCategoryDisplayName = (category: string) => {
    return category.replace('_', ' ').replace('MODULE', '');
  };

  const isRunning = job?.status === 'running';

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
              Job-based orchestration system that scrapes the entire CEC catalog, downloads datasheets, 
              parses specifications, and validates readiness gates. Target: 1,348 panels, 513 batteries, 200 inverters.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Button 
              onClick={startJob}
              disabled={loading || isRunning}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Database className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Starting...' : isRunning ? 'Running...' : 'Start Scraping'}
            </Button>
            
            <Button 
              onClick={resetJobs}
              disabled={loading || isRunning}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <AlertTriangle className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Resetting...' : 'Reset All Jobs'}
            </Button>
          </div>

          {job && (
            <div className="text-sm text-muted-foreground mb-4">
              Job: <span className="font-mono">{job.id}</span> • Status: <Badge className={getStateColor(job.status)}>{job.status}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="progress">Job Progress</TabsTrigger>
          <TabsTrigger value="catalog">Product Catalog</TabsTrigger>
          <TabsTrigger value="readiness">Readiness Gates</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Job-Based Scraping Progress
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Orchestrated data collection with job management and comprehensive progress tracking.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {progress.length > 0 ? (
                progress.map((item) => (
                  <div key={item.category} className="space-y-4 p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        {getCategoryDisplayName(item.category)}
                        {getStateIcon(item.state)}
                      </h3>
                      <Badge className={getStateColor(item.state)}>
                        {item.state}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{item.target}</div>
                        <div className="text-xs text-muted-foreground">Target</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{item.processed}</div>
                        <div className="text-xs text-muted-foreground">Processed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{item.pdf_done}</div>
                        <div className="text-xs text-muted-foreground">PDFs</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">{item.specs_done}</div>
                        <div className="text-xs text-muted-foreground">Specs</div>
                      </div>
                    </div>

                    {/* Progress Bars */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Processed</span>
                          <span className="font-mono">{getProgressPercentage(item.processed, item.target)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 bg-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${getProgressPercentage(item.processed, item.target)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>PDFs Downloaded</span>
                          <span className="font-mono">{getProgressPercentage(item.pdf_done, item.target)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 bg-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${getProgressPercentage(item.pdf_done, item.target)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Specs Parsed</span>
                          <span className="font-mono">{getProgressPercentage(item.specs_done, item.target)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 bg-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${getProgressPercentage(item.specs_done, item.target)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status Messages */}
                    {item.state === 'running' && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>Processing {getCategoryDisplayName(item.category).toLowerCase()}... {item.processed}/{item.target}</span>
                      </div>
                    )}
                    
                    {item.state === 'completed' && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-md">
                        <CheckCircle className="w-4 h-4" />
                        <span>Complete - {item.processed} products with {item.pdf_done} PDFs and {item.specs_done} parsed specs</span>
                      </div>
                    )}
                    
                    {item.state === 'failed' && (
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
                  <h3 className="text-lg font-medium mb-2">No Job Running</h3>
                  <p className="text-sm mb-4">Click "Start Scraping" to create a new job and begin processing.</p>
                  <Button 
                    onClick={startJob}
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

        <TabsContent value="readiness" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                System Readiness Gates
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Comprehensive validation system that ensures data quality and system readiness before production use.
              </p>
            </CardHeader>
            <CardContent>
              {readinessLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  <p>Checking readiness gates...</p>
                </div>
              ) : readinessStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50 dark:bg-gray-950">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Overall Status:</span>
                    <Badge className={readinessStatus.allPassing ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {readinessStatus.allPassing ? 'READY' : 'NOT READY'}
                    </Badge>
                  </div>
                  
                  <div className="grid gap-3">
                    {readinessStatus.gates.map((gate: any) => (
                      <div key={gate.gate} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {gate.passing ? 
                              <CheckCircle className="w-4 h-4 text-green-600" /> : 
                              <XCircle className="w-4 h-4 text-red-600" />
                            }
                            <span className="font-medium">{gate.gate}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{gate.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm">
                            {gate.current} / {gate.required}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round((gate.current / gate.required) * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-sm text-muted-foreground p-3 bg-gray-50 dark:bg-gray-950 rounded-md">
                    {readinessStatus.message}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-4 opacity-50" />
                  <p>Unable to load readiness status</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}