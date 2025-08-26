import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Lightbulb,
  TrendingUp,
  Zap,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { AICore, type AIAssistantResponse, type AppMode } from '@/lib/ai/AICore';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  mode: AppMode;
  onSuggestionAccept?: (suggestion: any) => void;
  className?: string;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  response?: AIAssistantResponse;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ 
  mode, 
  onSuggestionAccept,
  className 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState<AIAssistantResponse | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const aiCoreRef = useRef<AICore | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize AI Core
    aiCoreRef.current = new AICore({ mode });
    
    // Add welcome message
    setMessages([{
      id: 'welcome',
      type: 'assistant',
      content: mode === 'pro' ? 
        'AI Assistant activated! I can help optimize your solar system configuration and maximize rebates.' :
        'Basic assistance ready. Upgrade to Pro for AI-powered optimization.',
      timestamp: new Date()
    }]);
  }, [mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUserAction = async (action: string, payload: any) => {
    if (!aiCoreRef.current) return;

    setIsThinking(true);
    
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
    } catch (error) {
      console.error('AI Assistant error:', error);
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

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          AI Assistant
          {mode === 'pro' && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              <Sparkles className="w-3 h-3 mr-1" />
              Pro
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="space-y-3">
                <div className={cn(
                  "flex gap-3",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}>
                  {message.type === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4 text-purple-600" />
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-lg text-sm",
                    message.type === 'user' 
                      ? 'bg-blue-100 text-blue-900' 
                      : 'bg-gray-100 text-gray-900'
                  )}>
                    {message.content}
                  </div>
                </div>

                {/* Diagnostics */}
                {message.response?.diagnostics && message.response.diagnostics.length > 0 && (
                  <div className="ml-11 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">System Analysis</h4>
                    {message.response.diagnostics.map((diagnostic, i) => (
                      <div key={i} className={cn(
                        "p-3 rounded-lg border text-sm",
                        getSeverityColor(diagnostic.severity)
                      )}>
                        <div className="flex items-start gap-2">
                          {getSeverityIcon(diagnostic.severity)}
                          <div className="flex-1">
                            <p className="font-medium">{diagnostic.message}</p>
                            {diagnostic.suggestedAction && (
                              <p className="text-xs mt-1 opacity-75">{diagnostic.suggestedAction}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
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
            
            {/* Thinking indicator */}
            {isThinking && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-purple-600 animate-pulse" />
                </div>
                <div className="bg-gray-100 text-gray-600 p-3 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="ml-2">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Current System Status */}
        {currentResponse && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">System Status</h4>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  currentResponse.canProceed ? 'bg-green-500' : 'bg-red-500'
                )} />
                <span className="text-sm">
                  {currentResponse.canProceed ? 'Ready to proceed' : 'Issues need attention'}
                </span>
                <Badge variant="outline" className="ml-auto">
                  {Math.round(currentResponse.confidence * 100)}% confidence
                </Badge>
              </div>
            </div>
          </>
        )}

        {/* Quick Actions (Pro Mode) */}
        {mode === 'pro' && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleUserAction('OPTIMIZE_REBATES', {})}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Optimize Rebates
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleUserAction('CHECK_COMPATIBILITY', {})}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Check System
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAssistant;