import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Brain, Database, Target, Shield, Zap, AlertTriangle } from 'lucide-react';
import { checkReadinessGates, startTraining, forceReadyState, getTrainingStatus, type ReadinessStatus } from '@/lib/readiness-gates';
import { supabase } from '@/integrations/supabase/client';

interface ReadinessGateGuardProps {
  children: React.ReactNode;
}

export default function ReadinessGateGuard({ children }: ReadinessGateGuardProps) {
  const [readiness, setReadiness] = useState<ReadinessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainingStatus, setTrainingStatus] = useState<any>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState<any>(null);

  useEffect(() => {
    checkSystemReadiness();
    
    // Check less frequently to avoid annoying flickering
    const interval = setInterval(checkSystemReadiness, 60000); // Check every 60 seconds
    return () => clearInterval(interval);
  }, []);

  async function checkSystemReadiness() {
    try {
      // Only show loading on first check, not subsequent ones to avoid flickering
      if (!readiness) {
        setLoading(true);
      }
      
      // Check readiness gates
      const gatesResult = await checkReadinessGates();
      setReadiness(gatesResult);
      
      // Get training status
      const trainingResult = await getTrainingStatus();
      setTrainingStatus(trainingResult);
      
      // Get scraping status
      const { data: scrapingResult } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'status' }
      });
      setScrapingStatus(scrapingResult);
      
    } catch (error) {
      console.error('Failed to check system readiness:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartScraping() {
    try {
      await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'scrape_all' }
      });
      
      setTimeout(checkSystemReadiness, 2000);
    } catch (error) {
      console.error('Failed to start scraping:', error);
    }
  }

  async function handleStartTraining() {
    try {
      setIsTraining(true);
      await startTraining(50000);
      setTimeout(checkSystemReadiness, 2000);
    } catch (error) {
      console.error('Failed to start training:', error);
    } finally {
      setIsTraining(false);
    }
  }

  async function handleForceReady() {
    try {
      await forceReadyState();
      setTimeout(checkSystemReadiness, 1000);
    } catch (error) {
      console.error('Failed to force ready state:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Brain className="w-8 h-8 animate-pulse text-blue-600" />
              <div>
                <h3 className="font-semibold">Initializing System</h3>
                <p className="text-sm text-muted-foreground">Checking readiness status...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If system is ready, render the app
  if (readiness?.allPassing) {
    return <>{children}</>;
  }

  // System not ready - show readiness dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-6 h-6" />
              System Not Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The autonomous solar design system requires initialization before use. 
                Please complete the readiness gates below to unlock the full application.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Tabs defaultValue="gates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gates">Readiness Gates</TabsTrigger>
            <TabsTrigger value="scraping">Data Collection</TabsTrigger>
            <TabsTrigger value="training">AI Training</TabsTrigger>
            <TabsTrigger value="override">Development</TabsTrigger>
          </TabsList>

          <TabsContent value="gates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  System Readiness Gates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {readiness?.gates.map((gate) => (
                  <div key={gate.gate} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {gate.passing ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <div className="font-medium">{gate.gate.replace(/_/g, ' ').toUpperCase()}</div>
                        <div className="text-sm text-muted-foreground">{gate.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">
                        {gate.current.toLocaleString()} / {gate.required.toLocaleString()}
                      </div>
                      <Progress 
                        value={Math.min(100, (gate.current / gate.required) * 100)} 
                        className="w-32 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scraping" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  CEC Catalog Scraping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Collect comprehensive product data from the Clean Energy Council and manufacturer websites.
                </p>
                
                {scrapingStatus?.progress?.map((progress: any) => (
                  <div key={progress.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{progress.category}</span>
                      <Badge variant={progress.status === 'completed' ? 'default' : 'secondary'}>
                        {progress.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>Found: {progress.total_found || 0}</div>
                      <div>Processed: {progress.total_processed || 0}</div>
                      <div>PDFs: {progress.total_with_pdfs || 0}</div>
                      <div>Parsed: {progress.total_parsed || 0}</div>
                    </div>
                    <Progress 
                      value={progress.total_found > 0 ? (progress.total_processed / progress.total_found) * 100 : 0} 
                    />
                  </div>
                ))}
                
                <Button onClick={handleStartScraping} className="w-full">
                  <Database className="w-4 h-4 mr-2" />
                  Start CEC Catalog Scraping
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Pre-Boot Training (50,000 Episodes)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  The system must complete 50,000 autonomous training episodes before first use. 
                  This builds OCR accuracy, design optimization, and UI safety guards.
                </p>
                
                {trainingStatus && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Training Progress</span>
                      <span className="font-mono">
                        {trainingStatus.currentEpisodes.toLocaleString()} / {trainingStatus.targetEpisodes.toLocaleString()}
                      </span>
                    </div>
                    <Progress 
                      value={(trainingStatus.currentEpisodes / trainingStatus.targetEpisodes) * 100} 
                      className="h-3"
                    />
                    
                    {trainingStatus.recentMetrics?.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <div className="text-sm font-medium">OCR Accuracy</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {(trainingStatus.recentMetrics.find((m: any) => m.name === 'ocr_accuracy_batch')?.value * 100 || 0).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Design Success</div>
                          <div className="text-2xl font-bold text-green-600">
                            {(trainingStatus.recentMetrics.find((m: any) => m.name === 'design_pass_rate_batch')?.value * 100 || 0).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <Button 
                  onClick={handleStartTraining} 
                  disabled={isTraining}
                  className="w-full"
                >
                  {isTraining ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Training in Progress...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Start 50k Episode Training
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="override" className="space-y-4">
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <Shield className="w-5 h-5" />
                  Development Override
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Development Only:</strong> Force the system to ready state for testing. 
                    This bypasses safety checks and should not be used in production.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handleForceReady}
                  variant="outline"
                  className="w-full border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                >
                  Force Ready State (Development)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}