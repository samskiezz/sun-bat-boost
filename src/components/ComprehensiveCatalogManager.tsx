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
import DataCollectionPanel from './DataCollectionPanel';
import { DirectSpecsProcessor } from './DirectSpecsProcessor';
import { RealSpecsExtractor } from './RealSpecsExtractor';

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rZ2NhY3VoZHdwc2ZrYmd1ZGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjIwNzcsImV4cCI6MjA3MTY5ODA3N30.rtp0L8COz3XcmEzGqElLs-d08qHnZDbPr0ZWmyqq8Ms";

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
  pdf_done: number;
  specs_done: number;
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
    
    // Set up polling for running jobs - reduced frequency to prevent conflicts
    const interval = setInterval(() => {
      loadStatus();
    }, 5000); // Increased from 3s to 5s to reduce conflicts
    
    return () => clearInterval(interval);
  }, [jobId]);

  const [lastLoadTime, setLastLoadTime] = useState(0);

  async function loadStatus() {
    if (!jobId) return;
    
    // Debounce rapid calls
    const now = Date.now();
    if (now - lastLoadTime < 2000) return;
    setLastLoadTime(now);
    
    try {
      console.log('🔄 UI: Loading job status...');
      const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'status' }
      });

      if (error) throw error;
      
      // Only update if data is valid and consistent
      if (data && data.job) {
        console.log('📊 UI: Status response:', data);
        setJob(data.job);
        setProgress(data.progress || []);
        setProductCounts(data.productCounts || []);
      }
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
    console.log('🟣🟣🟣 START JOB FUNCTION CALLED!!! 🟣🟣🟣');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'start' }
      });

      if (error) throw error;
      console.log('📊 UI: Start job response:', data);

      if (!data) {
        console.error('❌ UI: No data returned from function');
        throw new Error('No data returned from scraper function');
      }

      const newJobId = data?.job_id;
      console.log('🔍 UI: Extracted job_id:', newJobId);

      if (!newJobId) {
        console.error('❌ UI: No job_id in response. Full data:', data);
        toast({
          title: "Warning",
          description: "Job may have started but no ID was returned. Check the system manager.",
          variant: "destructive",
        });
        return;
      }

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
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-300';
    }
  };

  // Color helpers for progress indicators
  const getStatusColor = (state: string): string => {
    switch (state) {
      case 'completed':
        return '#22c55e'; // Green
      case 'running': 
        return '#3b82f6'; // Blue
      case 'pending':
        return '#eab308'; // Yellow
      case 'failed':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSystemStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'queued':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    if (target === 0) return 0;
    // Log overshoot for developers but cap display at 100%
    if (current > target) {
      console.warn(`Gate overshoot detected - rawCurrent=${current}, target=${target}`);
    }
    return Math.min(100, Math.round((current / target) * 100));
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
              onClick={() => {
                console.log('🟣 PURPLE BUTTON CLICKED!!! About to call startJob()');
                alert('Purple button was clicked! Check console for logs.');
                startJob();
              }}
              disabled={loading || isRunning}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg p-4"
            >
              <Database className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '🔄 STARTING...' : isRunning ? '🏃 RUNNING...' : '🚀 CLICK ME TO START'}
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
          {/* Live Progress Dashboard */}
          <div className="grid gap-4">
            {progress.map((categoryProgress) => {
              // Calculate combined progress: 50% for PDFs, 50% for specs extraction
              const pdfProgress = categoryProgress.target > 0 
                ? (categoryProgress.pdf_done / categoryProgress.target) * 50 
                : 0;
              const specsProgress = categoryProgress.target > 0 
                ? (categoryProgress.specs_done / categoryProgress.target) * 50 
                : 0;
              const percentage = Math.round(pdfProgress + specsProgress);
              
              const statusColor = getStatusColor(categoryProgress.state);
              const statusIcon = getStatusIcon(categoryProgress.state);
              
              return (
                <Card key={categoryProgress.category} className="border-l-4" style={{ borderLeftColor: statusColor }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {statusIcon}
                        {getCategoryDisplayName(categoryProgress.category)}
                        <Badge 
                          className="ml-2" 
                          style={{ backgroundColor: statusColor, color: 'white' }}
                        >
                          {categoryProgress.state.toUpperCase()}
                        </Badge>
                      </CardTitle>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{percentage}%</div>
                        <div className="text-sm text-muted-foreground">
                          {categoryProgress.processed} / {categoryProgress.target}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Main Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Overall Progress</span>
                          <span>{categoryProgress.processed} of {categoryProgress.target} products</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: statusColor
                            }}
                          >
                            {percentage > 15 && (
                              <span className="text-xs text-white font-medium">{percentage}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Sub-Progress Bars */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              PDFs Downloaded
                            </span>
                            <span>{categoryProgress.pdf_done}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${categoryProgress.target > 0 ? Math.min(100, (categoryProgress.pdf_done / categoryProgress.target) * 100) : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              Specs Extracted
                            </span>
                            <span>{categoryProgress.specs_done}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${categoryProgress.target > 0 ? Math.min(100, (categoryProgress.specs_done / categoryProgress.target) * 100) : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Live Status Text */}
                      {categoryProgress.state === 'running' && (
                        <div className="text-sm text-blue-600 animate-pulse flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                          Actively scraping CEC database...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Overall System Status */}
            {job && (
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${getSystemStatusColor(job.status)} ${job.status === 'running' ? 'animate-pulse' : ''}`}></div>
                      <div>
                        <h3 className="font-semibold">System Status: {job.status.toUpperCase()}</h3>
                        <p className="text-sm text-muted-foreground">
                          Job ID: {job.id.split('-')[0]}...
                          {job.started_at && ` • Started: ${new Date(job.started_at).toLocaleTimeString()}`}
                        </p>
                      </div>
                    </div>
                    
                    {job.status === 'running' && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          {progress.reduce((sum, p) => sum + p.processed, 0)} / {progress.reduce((sum, p) => sum + p.target, 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Products</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {(!job || !progress.length) && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No scraping job active. Click "🚀 CLICK ME TO START" to begin CEC data collection.</p>
                </CardContent>
              </Card>
            )}
          </div>
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
                            {gate.current > gate.required 
                              ? `${gate.current} / ${gate.current}`
                              : `${gate.current} / ${gate.required}`
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.min(100, Math.round((gate.current / gate.required) * 100))}%
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
      
      {/* Real Specs Extraction */}
      <div className="mt-6">
        <RealSpecsExtractor />
      </div>
      
      {/* Direct Specs Processing (Fallback) */}
      <div className="mt-6">
        <DirectSpecsProcessor />
      </div>
    </div>
  );
}