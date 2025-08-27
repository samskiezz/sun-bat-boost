import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Lightbulb,
  TrendingUp,
  Zap,
  Sparkles,
  BarChart3,
  Settings,
  MessageSquare,
  Lock,
  FileText,
  Upload
} from 'lucide-react';
import { AICore, type AIAssistantResponse, type AppMode } from '@/lib/ai/AICore';
import { cn } from '@/lib/utils';
import UniversalOCRScanner from './UniversalOCRScanner';
import ComprehensiveTrainingDashboard from './ComprehensiveTrainingDashboard';

interface EnhancedAISystemProps {
  mode: AppMode;
  tier: 'free' | 'lite' | 'pro';
  onSuggestionAccept?: (suggestion: any) => void;
  onUpgradeRequest?: () => void;
  className?: string;
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  response?: AIAssistantResponse;
  isLimited?: boolean;
}

interface OptimizationResult {
  score: number;
  improvements: Array<{
    category: string;
    impact: string;
    confidence: number;
  }>;
}

export const EnhancedAISystem: React.FC<EnhancedAISystemProps> = ({ 
  mode, 
  tier,
  onSuggestionAccept,
  onUpgradeRequest,
  className 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState<AIAssistantResponse | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const aiCoreRef = useRef<AICore | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Usage limits based on tier
  const usageLimits = {
    free: { daily: 3, features: ['basic'] },
    lite: { daily: -1, features: ['basic', 'suggestions', 'analysis'] }, // unlimited
    pro: { daily: -1, features: ['basic', 'suggestions', 'analysis', 'optimization', 'realtime'] }
  };

  useEffect(() => {
    if (tier !== 'free') {
      aiCoreRef.current = new AICore({ mode });
    }
    
    // Add welcome message based on tier
    const welcomeMessage = getWelcomeMessage();
    setMessages([{
      id: 'welcome',
      type: 'system',
      content: welcomeMessage,
      timestamp: new Date()
    }]);
  }, [mode, tier]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getWelcomeMessage = () => {
    switch (tier) {
      case 'free':
        return '🚀 Welcome to the Solar Rebate Calculator! You have 3 free calculations today. Sign up for Lite to get unlimited access with AI suggestions.';
      case 'lite':
        return '⚡ Lite tier activated! Enjoy unlimited calculations with basic AI suggestions. Upgrade to Pro for advanced optimization.';
      case 'pro':
        return '✨ Pro tier activated! Full AI optimization, real-time analysis, and priority support at your service.';
    }
  };

  const canUseFeature = (feature: string): boolean => {
    const tierFeatures = usageLimits[tier].features;
    return tierFeatures.includes(feature);
  };

  const isWithinUsageLimit = (): boolean => {
    const limit = usageLimits[tier].daily;
    return limit === -1 || usageCount < limit;
  };

  const handleUserAction = async (action: string, payload: any) => {
    if (!isWithinUsageLimit()) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'system',
        content: `You've reached your daily limit of ${usageLimits[tier].daily} calculations. ${tier === 'free' ? 'Sign up for Lite to get unlimited access!' : 'Your limit will reset tomorrow.'}`,
        timestamp: new Date(),
        isLimited: true
      }]);
      return;
    }

    if (!canUseFeature('suggestions') && (action === 'OPTIMIZE_REBATES' || action === 'CHECK_COMPATIBILITY')) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'system',
        content: 'This feature requires Lite tier or higher. Upgrade to access AI suggestions and system analysis.',
        timestamp: new Date(),
        isLimited: true
      }]);
      return;
    }

    if (!aiCoreRef.current) return;

    setIsThinking(true);
    setUsageCount(prev => prev + 1);
    
    try {
      const response = await aiCoreRef.current.onUserAction(action, payload);
      setCurrentResponse(response);
      
      // Add assistant message with reasoning
      const assistantMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: response.reasoning,
        timestamp: new Date(),
        response
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Update optimization score for Pro users
      if (tier === 'pro' && canUseFeature('optimization')) {
        updateOptimizationResult(response);
      }
    } catch (error) {
      console.error('AI System error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error processing that request.',
        timestamp: new Date()
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const updateOptimizationResult = (response: AIAssistantResponse) => {
    const score = Math.round(response.confidence * 100);
    const improvements = [
      { category: 'Rebate Optimization', impact: 'High', confidence: response.confidence },
      { category: 'System Sizing', impact: 'Medium', confidence: response.confidence * 0.8 },
      { category: 'Cost Efficiency', impact: 'Medium', confidence: response.confidence * 0.9 }
    ];
    setOptimizationResult({ score, improvements });
  };

  const getSeverityIcon = (severity: 'info' | 'warn' | 'error') => {
    switch (severity) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: 'info' | 'warn' | 'error') => {
    switch (severity) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warn': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
    }
  };

  const renderUpgradePrompt = () => (
    <div className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Lock className="w-5 h-5 text-purple-600" />
        <div className="flex-1">
          <h4 className="font-medium text-purple-900">Unlock Advanced AI Features</h4>
          <p className="text-sm text-purple-700 mt-1">
            {tier === 'free' 
              ? 'Sign up for Lite to get unlimited calculations with AI suggestions, or upgrade to Pro for advanced optimization.'
              : 'Upgrade to Pro for real-time optimization, advanced analysis, and priority support.'
            }
          </p>
        </div>
        <Button size="sm" onClick={onUpgradeRequest} className="bg-purple-600 hover:bg-purple-700">
          {tier === 'free' ? 'Sign Up' : 'Upgrade'}
        </Button>
      </div>
    </div>
  );

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Solar Assistant
            <Badge variant="secondary" className={cn(
              tier === 'pro' ? 'bg-purple-100 text-purple-700' :
              tier === 'lite' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            )}>
              {tier === 'pro' && <Sparkles className="w-3 h-3 mr-1" />}
              {tier === 'lite' && <Zap className="w-3 h-3 mr-1" />}
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </Badge>
          </div>
          {tier === 'free' && (
            <Badge variant="outline" className="text-xs">
              {usageLimits.free.daily - usageCount} left today
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4">
        {tier === 'pro' ? (
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-5 text-xs">
              <TabsTrigger value="chat" className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="ocr" className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                OCR
              </TabsTrigger>
              <TabsTrigger value="training" className="flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Training
              </TabsTrigger>
              <TabsTrigger value="optimization" className="flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                Optimize
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Analysis
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="flex-1 flex flex-col mt-4">
              {renderChatInterface()}
            </TabsContent>
            
            <TabsContent value="ocr" className="flex-1 flex flex-col mt-4">
              {renderOCRInterface()}
            </TabsContent>
            
            <TabsContent value="training" className="flex-1 flex flex-col mt-4">
              {renderTrainingInterface()}
            </TabsContent>
            
            <TabsContent value="optimization" className="flex-1 flex flex-col mt-4">
              {renderOptimizationInterface()}
            </TabsContent>
            
            <TabsContent value="analysis" className="flex-1 flex flex-col mt-4">
              {renderAnalysisInterface()}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 flex flex-col">
            {renderChatInterface()}
            {(tier === 'free' || !canUseFeature('optimization')) && (
              <div className="mt-4">
                {renderUpgradePrompt()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  function renderChatInterface() {
    return (
      <>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="space-y-3">
                <div className={cn(
                  "flex gap-3",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}>
                  {(message.type === 'assistant' || message.type === 'system') && (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      message.type === 'system' ? 'bg-gray-100' : 'bg-purple-100'
                    )}>
                      <Brain className={cn(
                        "w-4 h-4",
                        message.type === 'system' ? 'text-gray-600' : 'text-purple-600'
                      )} />
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-lg text-sm",
                    message.type === 'user' ? 'bg-blue-100 text-blue-900' :
                    message.type === 'system' ? 'bg-gray-100 text-gray-900' :
                    'bg-purple-50 text-purple-900',
                    message.isLimited && 'border border-orange-200 bg-orange-50 text-orange-900'
                  )}>
                    {message.content}
                    {message.isLimited && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-2 w-full"
                        onClick={onUpgradeRequest}
                      >
                        {tier === 'free' ? 'Sign Up Free' : 'Upgrade to Pro'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Render suggestions and diagnostics as before */}
                {message.response?.suggestions && message.response.suggestions.length > 0 && (
                  <div className="ml-11 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Lightbulb className="w-4 h-4" />
                      AI Recommendations
                    </h4>
                    {message.response.suggestions.map((suggestion, i) => (
                      <div key={i} className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-green-800">{suggestion.reason}</p>
                            <div className="flex gap-4 mt-2 text-xs text-green-700">
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                +${suggestion.expectedImpact.rebates.toLocaleString()} rebates
                              </span>
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                {suggestion.expectedImpact.paybackPeriod.toFixed(1)}yr payback
                              </span>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => onSuggestionAccept?.(suggestion)}
                          >
                            Accept
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {isThinking && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-purple-600 animate-pulse" />
                </div>
                <div className="bg-purple-50 text-purple-600 p-3 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="ml-2">Optimizing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <Separator />
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleUserAction('OPTIMIZE_REBATES', {})}
              disabled={!canUseFeature('suggestions') || !isWithinUsageLimit()}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Optimize Rebates
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleUserAction('CHECK_COMPATIBILITY', {})}
              disabled={!canUseFeature('suggestions') || !isWithinUsageLimit()}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Check System
            </Button>
          </div>
        </div>
      </>
    );
  }

  function renderOptimizationInterface() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">System Optimization Score</h3>
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 rounded-full bg-purple-100"></div>
            <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
              <span className="text-2xl font-bold text-purple-600">
                {optimizationResult?.score || 85}%
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Optimization Opportunities</h4>
          {(optimizationResult?.improvements || [
            { category: 'Rebate Optimization', impact: 'High', confidence: 0.9 },
            { category: 'System Sizing', impact: 'Medium', confidence: 0.7 },
            { category: 'Cost Efficiency', impact: 'Medium', confidence: 0.8 }
          ]).map((improvement, index) => (
            <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">{improvement.category}</h5>
                <Badge variant={improvement.impact === 'High' ? 'default' : 'secondary'}>
                  {improvement.impact} Impact
                </Badge>
              </div>
              <Progress value={improvement.confidence * 100} className="h-2" />
              <p className="text-sm text-gray-600 mt-2">
                Confidence: {Math.round(improvement.confidence * 100)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderAnalysisInterface() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-Time System Analysis</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-2">Compatibility</h4>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600">All components compatible</span>
            </div>
          </Card>
          
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-600">Above average efficiency</span>
            </div>
          </Card>
          
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-2">Rebate Potential</h4>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-gray-600">Maximum rebates available</span>
            </div>
          </Card>
          
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-2">ROI Projection</h4>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600">6.2 year payback</span>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  function renderOCRInterface() {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Universal OCR Scanner</h3>
          <p className="text-sm text-gray-600">Upload PDFs, images, or Excel files to extract solar product specifications</p>
        </div>
        <UniversalOCRScanner />
      </div>
    );
  }

  function renderTrainingInterface() {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Training Dashboard</h3>
          <p className="text-sm text-gray-600">Monitor and control the AI training system</p>
        </div>
        <div className="h-[400px] overflow-y-auto">
          <ComprehensiveTrainingDashboard />
        </div>
      </div>
    );
  }
};

export default EnhancedAISystem;