// Standardized metric display tile
import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { tokens } from "@/theme/tokens";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/format";

interface MetricTileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  icon?: LucideIcon;
  badge?: string;
  variant?: "default" | "glass" | "primary";
  format?: "currency" | "number" | "percent" | "custom";
  className?: string;
  onClick?: () => void;
}

export function MetricTile({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  badge,
  variant = "default",
  format = "custom",
  className,
  onClick
}: MetricTileProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === "string") return val;
    
    switch (format) {
      case "currency":
        return formatCurrency(val);
      case "number":
        return formatNumber(val);
      case "percent":
        return formatPercent(val);
      default:
        return String(val);
    }
  };

  const variants = {
    default: "bg-card border-border hover:border-primary/20",
    glass: `${tokens.card} ${tokens.cardHover}`,
    primary: `${tokens.buttonPrimary} ${tokens.glow} text-white`
  };

  const TrendIcon = trend?.isPositive ? TrendingUp : trend?.isPositive === false ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: onClick ? 1.02 : 1.0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "p-6 rounded-2xl border",
        variants[variant],
        tokens.transition,
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn(
              "p-2 rounded-lg",
              variant === "glass" 
                ? "bg-white/10 border border-white/20"
                : variant === "primary"
                ? "bg-white/20"
                : "bg-primary/10"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                variant === "primary" ? "text-white" : "text-primary"
              )} />
            </div>
          )}
          
          <div>
            <h3 className={cn(
              "font-medium text-sm",
              variant === "glass" 
                ? tokens.textMuted
                : variant === "primary"
                ? "text-white/80"
                : "text-muted-foreground"
            )}>
              {title}
            </h3>
            
            {badge && (
              <Badge 
                variant={variant === "primary" ? "secondary" : "outline"} 
                className="mt-1 text-xs"
              >
                {badge}
              </Badge>
            )}
          </div>
        </div>

        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
            trend.isPositive 
              ? tokens.statusSuccess
              : trend.isPositive === false
              ? tokens.statusError
              : "bg-muted/50 text-muted-foreground"
          )}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend.value)}%
            {trend.label && <span className="ml-1">{trend.label}</span>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className={cn(
          "text-2xl font-bold",
          variant === "primary" ? "text-white" : "text-foreground"
        )}>
          {formatValue(value)}
        </div>
        
        {subtitle && (
          <p className={cn(
            "text-sm",
            variant === "glass" 
              ? tokens.textMuted
              : variant === "primary"
              ? "text-white/70"
              : "text-muted-foreground"
          )}>
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}