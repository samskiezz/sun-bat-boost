import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface FuturisticBannerProps {
  title: string;
  subtitle: string;
  description?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    icon?: LucideIcon;
  };
  gradient?: 'primary' | 'vpp' | 'glass' | 'subtle';
  className?: string;
  compact?: boolean;
}

export const FuturisticBanner: React.FC<FuturisticBannerProps> = ({
  title,
  subtitle,
  description,
  icon: Icon,
  badge,
  gradient = 'primary',
  className = '',
  compact = false
}) => {
  const gradientClasses = {
    primary: 'bg-gradient-to-br from-primary/20 to-primary-glow/30',
    vpp: 'bg-gradient-to-br from-violet-500/20 to-purple-600/30',
    glass: 'bg-gradient-to-br from-white/10 to-white/5',
    subtle: 'bg-gradient-subtle/20'
  };

  const iconAnimation = {
    rotate: [0, 5, -5, 0],
    scale: [1, 1.05, 1]
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`relative overflow-hidden ${compact ? 'p-4' : 'p-6 md:p-8'} ${className}`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 glass-card">
        <div className={`absolute inset-0 ${gradientClasses[gradient]}`} />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ transform: "skewX(-45deg)" }}
        />
        
        {/* Floating particles */}
        {!compact && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-primary/30 rounded-full"
                style={{
                  left: `${20 + i * 30}%`,
                  top: `${20 + i * 15}%`,
                }}
                animate={{
                  y: [-10, 10, -10],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 2 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Animated icon */}
            <motion.div
              className={`${compact ? 'p-2' : 'p-3'} rounded-2xl bg-gradient-to-br from-primary/30 to-primary-glow/40 backdrop-blur-sm border border-primary/20`}
              animate={iconAnimation}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} text-primary`} />
            </motion.div>

            {/* Title section */}
            <div>
              <motion.h1
                className={`${compact ? 'text-2xl' : 'text-3xl md:text-4xl'} font-bold bg-gradient-primary bg-clip-text text-transparent`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                {title}
              </motion.h1>
              <motion.p
                className={`${compact ? 'text-sm' : 'text-lg'} text-foreground/80 mt-1`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                {subtitle}
              </motion.p>
            </div>
          </div>

          {/* Badge */}
          {badge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <Badge 
                variant="outline" 
                className="bg-white/10 border-white/20 text-foreground/80 backdrop-blur-sm gap-2"
              >
                {badge.icon && <badge.icon className="w-4 h-4" />}
                {badge.text}
              </Badge>
            </motion.div>
          )}
        </div>

        {/* Description */}
        {description && !compact && (
          <motion.p
            className="text-foreground/70 leading-relaxed max-w-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {description}
          </motion.p>
        )}

        {/* Progress indicators */}
        <div className="flex gap-2 mt-4">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="h-1 bg-primary/20 rounded-full flex-1"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
            >
              <motion.div
                className="h-full bg-gradient-primary rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: i === 0 ? 1 : 0.3 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.8 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};