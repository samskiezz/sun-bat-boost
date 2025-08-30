// Unified glassmorphic banner component
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { tokens } from "@/theme/tokens";
import { cn } from "@/lib/utils";

interface BannerProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: "default" | "glassHolo" | "primary" | "gradient";
  className?: string;
  children?: React.ReactNode;
}

export function Banner({
  title,
  subtitle,
  icon: Icon,
  variant = "default",
  className,
  children
}: BannerProps) {
  const variants = {
    default: "bg-card border-border",
    glassHolo: `${tokens.panel} ${tokens.hologram}`,
    primary: `${tokens.buttonPrimary} ${tokens.glow}`,
    gradient: "bg-gradient-primary border-0 text-white"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden p-8 md:p-12",
        variants[variant],
        tokens.transition,
        className
      )}
    >
      {/* Animated background for glassHolo variant */}
      {variant === "glassHolo" && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/10 opacity-90">
          <div className={tokens.backgroundOverlay} />
        </div>
      )}

      <div className="relative z-10">
        <div className="text-center space-y-6">
          {/* Header with Icon */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col items-center gap-4"
          >
            {Icon && (
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                  "p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-xl border border-primary/30",
                  variant === "glassHolo" && tokens.glow
                )}
              >
                <Icon className="h-10 w-10 text-primary" />
              </motion.div>
            )}
            
            <div className="space-y-2">
              <h1 className={cn(
                "text-3xl md:text-4xl lg:text-5xl font-bold leading-tight",
                variant === "glassHolo" || variant === "primary" || variant === "gradient"
                  ? "bg-gradient-to-r from-white via-primary-glow to-white bg-clip-text text-transparent"
                  : "bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent"
              )}>
                {title}
              </h1>
              
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className={cn(
                    "text-base md:text-lg",
                    variant === "glassHolo" || variant === "primary" || variant === "gradient"
                      ? tokens.textMuted
                      : "text-muted-foreground"
                  )}
                >
                  {subtitle}
                </motion.p>
                </p>
              )}
            </div>
          </motion.div>

          {/* Additional content */}
          {children && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {children}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}