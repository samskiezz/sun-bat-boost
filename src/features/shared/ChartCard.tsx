// Standardized chart container with glassmorphic styling
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, Download, RefreshCw } from "lucide-react";
import { tokens } from "@/theme/tokens";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  variant?: "default" | "glass";
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onDownload?: () => void;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  icon: Icon,
  badge,
  variant = "default",
  loading = false,
  error,
  onRefresh,
  onDownload,
  children,
  className,
  headerActions
}: ChartCardProps) {
  const cardClasses = variant === "glass" 
    ? `${tokens.card} ${tokens.cardHover}`
    : "bg-card border-border";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className={cn(cardClasses, tokens.transition)}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {Icon && (
                <div className={cn(
                  "p-2 rounded-lg",
                  variant === "glass"
                    ? "bg-white/10 border border-white/20"
                    : "bg-primary/10"
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    variant === "glass" ? "text-white" : "text-primary"
                  )} />
                </div>
              )}
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className={cn(
                    "text-lg font-semibold",
                    variant === "glass" && "text-white"
                  )}>
                    {title}
                  </CardTitle>
                  
                  {badge && (
                    <Badge 
                      variant={variant === "glass" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {badge}
                    </Badge>
                  )}
                  
                  {loading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <RefreshCw className="h-4 w-4 text-primary" />
                    </motion.div>
                  )}
                </div>
                
                {subtitle && (
                  <p className={cn(
                    "text-sm",
                    variant === "glass" 
                      ? "text-white/70"
                      : "text-muted-foreground"
                  )}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {headerActions}
              
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                  className={cn(
                    variant === "glass" && "text-white hover:bg-white/10"
                  )}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              
              {onDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDownload}
                  className={cn(
                    variant === "glass" && "text-white hover:bg-white/10"
                  )}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {error && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              tokens.statusError
            )}>
              {error}
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}