import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LucideIcon, ChevronRight } from 'lucide-react';

interface StepInfo {
  id: string;
  title: string;
  icon: LucideIcon;
  description?: string;
}

interface StepBannerProps {
  currentStep: string;
  steps: StepInfo[];
  title: string;
  subtitle: string;
  icon: LucideIcon;
  className?: string;
  showProgress?: boolean;
  compact?: boolean;
}

export const StepBanner: React.FC<StepBannerProps> = ({
  currentStep,
  steps,
  title,
  subtitle,
  icon: MainIcon,
  className = '',
  showProgress = true,
  compact = false
}) => {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const currentStepInfo = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <motion.div
      className={`sticky top-0 z-40 ${className}`}
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="glass-card border-b border-white/10 backdrop-blur-xl">
        <div className="relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary-glow/5 to-primary/10" />
          
          {/* Flowing light effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{ transform: "skewX(-45deg)", width: "200%" }}
          />

          <div className={`relative ${compact ? 'p-4' : 'p-6'}`}>
            {/* Header section */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {/* Main icon */}
                <motion.div
                  className={`${compact ? 'p-2' : 'p-3'} rounded-xl bg-gradient-to-br from-primary/30 to-primary-glow/40 backdrop-blur-sm border border-primary/20`}
                  animate={{ rotate: [0, 2, -2, 0], scale: [1, 1.02, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <MainIcon className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} text-primary`} />
                </motion.div>

                {/* Title and current step */}
                <div>
                  <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-foreground`}>
                    {title}
                  </h2>
                  <p className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                    {subtitle}
                  </p>
                </div>
              </div>

              {/* Step indicator badge */}
              <Badge 
                variant="outline" 
                className="bg-white/10 border-white/20 text-foreground/80 backdrop-blur-sm"
              >
                Step {currentStepIndex + 1} of {steps.length}
              </Badge>
            </div>

            {/* Current step info */}
            {currentStepInfo && (
              <motion.div
                className="flex items-center gap-3 mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                key={currentStep}
              >
                <currentStepInfo.icon className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">
                  {currentStepInfo.title}
                </span>
                {currentStepInfo.description && (
                  <>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {currentStepInfo.description}
                    </span>
                  </>
                )}
              </motion.div>
            )}

            {/* Progress section */}
            {showProgress && (
              <div className="space-y-3">
                {/* Progress bar */}
                <div className="relative">
                  <Progress 
                    value={progress} 
                    className="h-2 bg-white/10"
                  />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>

                {/* Step navigation dots */}
                <div className="flex justify-between relative">
                  {steps.map((step, index) => {
                    const isActive = index === currentStepIndex;
                    const isCompleted = index < currentStepIndex;
                    
                    return (
                      <motion.div
                        key={step.id}
                        className="flex flex-col items-center gap-2"
                        initial={{ scale: 0.8, opacity: 0.6 }}
                        animate={{ 
                          scale: isActive ? 1.1 : 0.9,
                          opacity: isActive ? 1 : isCompleted ? 0.8 : 0.4
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Step circle */}
                        <div
                          className={`
                            w-8 h-8 rounded-full border-2 flex items-center justify-center
                            ${isActive 
                              ? 'border-primary bg-primary/20 text-primary' 
                              : isCompleted 
                                ? 'border-primary/60 bg-primary/10 text-primary/60'
                                : 'border-muted-foreground/30 bg-muted/20 text-muted-foreground/50'
                            }
                          `}
                        >
                          <step.icon className="w-4 h-4" />
                        </div>

                        {/* Step label */}
                        <span 
                          className={`
                            text-xs font-medium text-center max-w-16 leading-tight
                            ${isActive ? 'text-primary' : 'text-muted-foreground/60'}
                          `}
                        >
                          {step.title}
                        </span>

                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            layoutId="step-indicator"
                          />
                        )}
                      </motion.div>
                    );
                  })}

                  {/* Connection lines */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted-foreground/20 -z-10" />
                  <motion.div
                    className="absolute top-4 left-4 h-0.5 bg-gradient-primary -z-10"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};