import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';

interface EnhancedSliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  unit?: string;
  description?: string;
  gradient?: 'primary' | 'secondary' | 'success' | 'warning';
  showValue?: boolean;
  marks?: Array<{ value: number; label: string }>;
  className?: string;
}

export const EnhancedSlider: React.FC<EnhancedSliderProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  unit = '',
  description,
  gradient = 'primary',
  showValue = true,
  marks = [],
  className = ''
}) => {
  const [isActive, setIsActive] = useState(false);
  const [displayValue, setDisplayValue] = useState(value[0]);

  useEffect(() => {
    setDisplayValue(value[0]);
  }, [value]);

  const gradientClasses = {
    primary: 'bg-gradient-to-r from-primary/80 to-primary-glow/80',
    secondary: 'bg-gradient-to-r from-blue-500/80 to-cyan-500/80',
    success: 'bg-gradient-to-r from-emerald-500/80 to-green-500/80',
    warning: 'bg-gradient-to-r from-amber-500/80 to-orange-500/80'
  };

  const percentage = ((displayValue - min) / (max - min)) * 100;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-foreground">
            {label}
          </label>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>

        {showValue && (
          <motion.div
            className="flex items-center gap-2"
            animate={{ scale: isActive ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className={`px-3 py-1 rounded-full glass-subtle border border-white/20`}>
              <span className="text-sm font-mono font-semibold text-foreground">
                {displayValue}
                {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Slider container with enhanced styling */}
      <div className="relative">
        {/* Track background with holographic effect */}
        <div className="relative p-4 rounded-xl glass-card border border-white/10">
          <div className="relative">
            {/* Custom progress indicator */}
            <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 rounded-full bg-muted/30">
              <motion.div
                className={`h-full rounded-full ${gradientClasses[gradient]} relative overflow-hidden`}
                style={{ width: `${percentage}%` }}
                layoutId={`slider-progress-${label}`}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
            </div>

            {/* Enhanced Slider */}
            <Slider
              value={value}
              onValueChange={(newValue) => {
                onValueChange(newValue);
                setDisplayValue(newValue[0]);
              }}
              onValueCommit={() => setIsActive(false)}
              onPointerDown={() => setIsActive(true)}
              min={min}
              max={max}
              step={step}
              className="relative"
            />

            {/* Value indicator that follows the thumb */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  className="absolute -top-12 left-0 pointer-events-none"
                  style={{ left: `${percentage}%` }}
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="relative flex items-center justify-center -translate-x-1/2">
                    <div className="px-2 py-1 rounded-lg glass-card border border-primary/30">
                      <span className="text-xs font-mono font-semibold text-primary">
                        {displayValue}{unit}
                      </span>
                    </div>
                    {/* Arrow pointing down */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-primary/30" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Marks */}
          {marks.length > 0 && (
            <div className="flex justify-between mt-2 px-2">
              {marks.map((mark, index) => {
                const markPercentage = ((mark.value - min) / (max - min)) * 100;
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center"
                    style={{ position: 'absolute', left: `${markPercentage}%` }}
                  >
                    <div className="w-1 h-1 bg-muted-foreground/50 rounded-full mb-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {mark.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating particles around active slider */}
        <AnimatePresence>
          {isActive && (
            <>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-primary/60 rounded-full pointer-events-none"
                  style={{
                    left: `${percentage + (i - 1) * 5}%`,
                    top: '50%',
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    y: [-10, -30, -50],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};