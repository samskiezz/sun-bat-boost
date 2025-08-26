import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Download,
  FileText,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CatalogSession {
  id: string;
  status: string;
  current_phase: string;
  total_phases: number;
  completed_phases: number;
  error?: string;
  started_at: string;
  completed_at?: string;
}

interface CatalogPhase {
  phase_name: string;
  phase_status: string;
  progress_percent: number;
  details: any;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

const CATALOG_PHASES = [
  'data_scraping',
  'pdf_download',
  'spec_extraction',
  'data_validation',
  'completion'
];

const PHASE_ICONS = {
  data_scraping: Download,
  pdf_download: FileText,
  spec_extraction: Zap,
  data_validation: CheckCircle2,
  completion: CheckCircle2
};

const PHASE_LABELS = {
  data_scraping: 'CEC Data Scraping',
  pdf_download: 'PDF Downloads',
  spec_extraction: 'Specification Extraction',
  data_validation: 'Data Validation',
  completion: 'Catalog Completion'
};

export default function OneCatalogManager() {
  const [session, setSession] = useState<CatalogSession | null>(null);
  const [phases, setPhases] = useState<CatalogPhase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [productCounts, setProductCounts] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadStatus();
    loadProductCounts();
    
    // Load from localStorage if available
    const savedSession = localStorage.getItem('catalogManagerSession');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        setSession(parsedSession);
      } catch (e) {
        console.error('Failed to parse saved catalog session:', e);
      }
    }
    
    // Refresh every 10 seconds when active
    const interval = setInterval(() => {
      if (session?.status === 'running') {
        loadStatus();
        loadProductCounts();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [session?.status]);

  const loadStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('catalog-orchestrator', {
        body: { action: 'get_status' }
      });

      if (error) {
        console.error('Failed to load catalog status:', error);
        return;
      }

      if (data?.success) {
        setSession(data.session);
        setPhases(data.phases || []);
        
        // Save to localStorage
        if (data.session) {
          localStorage.setItem('catalogManagerSession', JSON.stringify(data.session));
        }
      }
    } catch (error) {
      console.error('Catalog status loading error:', error);
    }
  };

  const loadProductCounts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-product-counts');
      
      if (error) {
        console.error('Failed to load product counts:', error);
        setProductCounts([]);
        return;
      }

      console.log('📊 Product counts data received:', data);

      // Ensure data is always an array
      if (Array.isArray(data)) {
        setProductCounts(data);
      } else if (data && data.productCounts && Array.isArray(data.productCounts)) {
        // Handle nested structure if it exists
        setProductCounts(data.productCounts);
      } else {
        console.warn('Product counts data is not an array:', data);
        setProductCounts([]);
      }
    } catch (error) {
      console.error('Product counts loading error:', error);
      setProductCounts([]); // Reset to empty array on error
    }
  };

  const startCompleteCatalogBuild = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('catalog-orchestrator', {
        body: { 
          action: 'start_complete_catalog_build',
          config: {
            scrapeAll: true,
            downloadPDFs: true,
            extractSpecs: true,
            validateData: true
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "🚀 Complete Catalog Build Started",
          description: "Full CEC catalog processing initiated. This will scrape all data, download PDFs, and extract specifications automatically.",
        });
        
        // Immediately refresh status
        setTimeout(() => {
          loadStatus();
          loadProductCounts();
        }, 2000);
      } else {
        throw new Error(data?.error || 'Failed to start catalog build');
      }
    } catch (error) {
      console.error('Catalog build error:', error);
      toast({
        title: "❌ Catalog Build Failed to Start",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pauseCatalogBuild = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('catalog-orchestrator', {
        body: { action: 'pause' }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "⏸️ Catalog Build Paused",
          description: "Catalog processing has been paused. You can resume it later.",
        });
        loadStatus();
      }
    } catch (error) {
      console.error('Pause error:', error);
      toast({
        title: "❌ Failed to Pause",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resumeCatalogBuild = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('catalog-orchestrator', {
        body: { action: 'resume' }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "▶️ Catalog Build Resumed",
          description: "Catalog processing has been resumed and will continue in the background.",
        });
        loadStatus();
      }
    } catch (error) {
      console.error('Resume error:', error);
      toast({
        title: "❌ Failed to Resume",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getOverallProgress = () => {
    if (!session || !phases.length) return 0;
    
    const totalProgress = phases.reduce((sum, phase) => sum + (phase.progress_percent || 0), 0);
    return Math.round(totalProgress / phases.length);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500';
      case 'running': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-slate-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'running': return Play;
      case 'failed': return AlertTriangle;
      case 'paused': return Pause;
      default: return Clock;
    }
  };

  const getTotalProducts = () => {
    if (!Array.isArray(productCounts)) {
      console.warn('productCounts is not an array:', productCounts);
      return 0;
    }
    return productCounts.reduce((sum, cat) => sum + (cat.total_count || cat.count || 0), 0);
  };

  const getTotalWithPDFs = () => {
    if (!Array.isArray(productCounts)) {
      console.warn('productCounts is not an array:', productCounts);
      return 0;
    }
    return productCounts.reduce((sum, cat) => sum + (cat.with_pdf_count || cat.with_specs || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Master Control Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-full bg-primary/10">
              <Database className="w-6 h-6 text-primary" />
            </div>
            One-Click Complete Catalog Manager
            {session?.status && (
              <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                {session.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Control Buttons */}
          <div className="flex items-center gap-4">
            {!session || session.status === 'completed' || session.status === 'failed' ? (
              <Button
                onClick={startCompleteCatalogBuild}
                disabled={isLoading}
                size="lg"
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <Play className="w-5 h-5" />
                {isLoading ? 'Starting...' : 'Build Complete CEC Catalog'}
              </Button>
            ) : (
              <div className="flex gap-2">
                {session.status === 'running' && (
                  <Button onClick={pauseCatalogBuild} variant="outline" size="lg">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                )}
                {session.status === 'paused' && (
                  <Button onClick={resumeCatalogBuild} size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                )}
              </div>
            )}
            
            <Button onClick={loadStatus} variant="ghost" size="lg">
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Product Counts Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{getTotalProducts().toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Products</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{getTotalWithPDFs().toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">With PDFs</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{productCounts.length}</div>
              <div className="text-xs text-muted-foreground">Categories</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {getTotalProducts() > 0 ? Math.round((getTotalWithPDFs() / getTotalProducts()) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">PDF Coverage</div>
            </div>
          </div>

          {/* Overall Progress */}
          {session && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {session.completed_phases}/{session.total_phases} phases completed
                </span>
              </div>
              <Progress 
                value={getOverallProgress()} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                Current Phase: {PHASE_LABELS[session.current_phase as keyof typeof PHASE_LABELS] || session.current_phase}
              </div>
            </div>
          )}

          {/* Session Info */}
          {session && (
            <div className="text-sm text-muted-foreground">
              Session ID: {session.id.slice(0, 8)}... | 
              Started: {new Date(session.started_at).toLocaleDateString()} {new Date(session.started_at).toLocaleTimeString()}
              {session.completed_at && (
                <> | Completed: {new Date(session.completed_at).toLocaleDateString()} {new Date(session.completed_at).toLocaleTimeString()}</>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catalog Phases */}
      {phases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Catalog Build Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {phases.map((phase, index) => {
                const PhaseIcon = PHASE_ICONS[phase.phase_name as keyof typeof PHASE_ICONS] || Clock;
                const StatusIcon = getStatusIcon(phase.phase_status);
                
                return (
                  <div key={phase.phase_name} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-full bg-muted">
                        <PhaseIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {PHASE_LABELS[phase.phase_name as keyof typeof PHASE_LABELS] || phase.phase_name}
                          </span>
                          <div className="flex items-center gap-1">
                            <StatusIcon className="w-4 h-4" />
                            <Badge variant="outline" className={getStatusColor(phase.phase_status)}>
                              {phase.phase_status}
                            </Badge>
                          </div>
                        </div>
                        {phase.phase_status === 'running' && (
                          <Progress 
                            value={phase.progress_percent} 
                            className="h-1 mt-2"
                          />
                        )}
                        {phase.error && (
                          <div className="text-xs text-destructive mt-1">
                            Error: {phase.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {phase.phase_status === 'running' && `${Math.round(phase.progress_percent)}%`}
                      {phase.completed_at && (
                        <div>
                          ✓ {new Date(phase.completed_at).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {Array.isArray(productCounts) && productCounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {productCounts.map((category) => (
                <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{category.category}</Badge>
                    <span className="font-medium">{category.total_count?.toLocaleString() || 0} products</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>PDFs: {category.with_pdf_count?.toLocaleString() || 0}</span>
                    <span>Active: {category.active_count?.toLocaleString() || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          <strong>Fully Automated Catalog Management:</strong> This system will automatically scrape 
          the entire CEC catalog, download all PDFs, extract specifications, and validate data quality. 
          The process runs completely in the background with progress tracking and resumable operations.
        </AlertDescription>
      </Alert>
    </div>
  );
}