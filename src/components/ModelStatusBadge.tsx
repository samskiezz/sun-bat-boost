import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface ModelStatusBadgeProps {
  modelName?: string;
  version?: string;
  latency?: number;
  accuracy?: number;
  confidence?: number;
  fallback?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ModelStatusBadge: React.FC<ModelStatusBadgeProps> = ({
  modelName = 'solar_roi',
  version = 'v0.1',
  latency = 120,
  accuracy = 92.5,
  confidence = 0.95,
  fallback = false,
  size = 'sm'
}) => {
  const displayName = fallback ? `${modelName} (fallback)` : modelName;
  const displayVersion = fallback ? 'fallback v0.1' : version;
  
  const getStatusColor = () => {
    if (fallback) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (confidence && confidence > 0.9) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (confidence && confidence > 0.8) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  };

  const getIcon = () => {
    if (fallback) return <AlertTriangle className="h-3 w-3" />;
    if (confidence && confidence > 0.9) return <CheckCircle className="h-3 w-3" />;
    return <Zap className="h-3 w-3" />;
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5', 
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge 
        variant="outline" 
        className={`${getStatusColor()} border ${sizeClasses[size]} font-mono`}
      >
        <div className="flex items-center gap-1">
          {getIcon()}
          <span>Model: {displayName} {displayVersion}</span>
        </div>
      </Badge>
      
      {latency && (
        <Badge variant="outline" className="text-xs font-mono border-gray-500/30">
          p95: {latency}ms
        </Badge>
      )}
      
      {accuracy && !fallback && (
        <Badge variant="outline" className="text-xs font-mono border-blue-500/30 text-blue-400">
          MAE: {accuracy.toFixed(1)}%
        </Badge>
      )}
      
      {confidence && !fallback && (
        <Badge variant="outline" className="text-xs font-mono border-purple-500/30 text-purple-400">
          Conf: {(confidence * 100).toFixed(0)}%
        </Badge>
      )}
    </div>
  );
};