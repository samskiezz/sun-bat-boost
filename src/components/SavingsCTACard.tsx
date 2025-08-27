import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Glass } from './Glass';

interface SavingsCTACardProps {
  onStartWizard: () => void;
  className?: string;
}

export const SavingsCTACard: React.FC<SavingsCTACardProps> = ({ onStartWizard, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Glass className="relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary-glow/15 to-transparent animate-pulse" />
        
        {/* Moving gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-slide-right opacity-50" />
        
        <div className="relative p-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    How much can I save?
                  </h3>
                  <p className="text-sm text-muted-foreground">(Solar + Battery)</p>
                </div>
              </div>
              
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
                Get personalized solar and battery recommendations with instant savings calculations. 
                Upload your energy bill and let our AI design the perfect system for your needs.
              </p>
              
              <div className="flex items-center gap-8 mb-6">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">AI-Powered Design</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">Instant ROI Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-medium">Bill Upload OCR</span>
                </div>
              </div>
              
              <Button 
                onClick={onStartWizard}
                size="lg"
                className="bg-gradient-to-r from-primary to-primary-glow text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                Start Savings Wizard
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            {/* Decorative elements */}
            <div className="hidden md:block relative">
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 border border-primary/30"
              />
              <motion.div
                animate={{ 
                  rotate: -360,
                  scale: [1.1, 1, 1.1]
                }}
                transition={{ 
                  rotate: { duration: 15, repeat: Infinity, ease: "linear" },
                  scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute top-2 left-2 w-20 h-20 rounded-full bg-gradient-to-br from-primary-glow/30 to-primary/30 border border-primary-glow/40"
              />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </Glass>
    </motion.div>
  );
};