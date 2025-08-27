import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Zap, Brain, Target, Cpu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type AccuracyMode = 'auto' | 'preview' | 'standard' | 'exact';

interface AccuracyToggleProps {
  onChange?: (mode: AccuracyMode) => void;
}

const ACCURACY_MODES = [
  {
    key: 'auto' as AccuracyMode,
    label: 'Auto',
    icon: Brain,
    description: 'AI chooses best approach',
    color: 'bg-purple-500'
  },
  {
    key: 'preview' as AccuracyMode,
    label: 'Preview',
    icon: Zap,
    description: 'Fast estimates',
    color: 'bg-blue-500'
  },
  {
    key: 'standard' as AccuracyMode,
    label: 'Standard',
    icon: Target,
    description: 'Balanced accuracy',
    color: 'bg-green-500'
  },
  {
    key: 'exact' as AccuracyMode,
    label: 'Exact',
    icon: Cpu,
    description: 'Maximum precision',
    color: 'bg-orange-500'
  }
];

export const AccuracyToggle: React.FC<AccuracyToggleProps> = ({ onChange }) => {
  const [mode, setMode] = useState<AccuracyMode>(() => 
    (localStorage.getItem('accuracy.mode') as AccuracyMode) || 'auto'
  );
  const [chosenMode, setChosenMode] = useState<AccuracyMode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem('accuracy.mode', mode);
    onChange?.(mode);
    
    // Simulate meta-controller choice in Auto mode
    if (mode === 'auto') {
      const autoChoice: AccuracyMode = Math.random() > 0.7 ? 'exact' : 'standard';
      setChosenMode(autoChoice);
      
      // Publish on message bus
      window.dispatchEvent(new CustomEvent('accuracy.mode', { 
        detail: { mode: autoChoice, chosen: true } 
      }));
    } else {
      setChosenMode(null);
      window.dispatchEvent(new CustomEvent('accuracy.mode', { 
        detail: { mode, chosen: false } 
      }));
    }
  }, [mode, onChange]);

  const handleModeChange = (newMode: AccuracyMode) => {
    setMode(newMode);
    toast({
      title: "Accuracy Mode Changed",
      description: `Switched to ${ACCURACY_MODES.find(m => m.key === newMode)?.label} mode`,
    });
  };

  const currentMode = ACCURACY_MODES.find(m => m.key === mode);
  const displayMode = chosenMode ? ACCURACY_MODES.find(m => m.key === chosenMode) : currentMode;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {displayMode?.icon && <displayMode.icon className="w-4 h-4" />}
          <span className="hidden sm:inline">
            {mode === 'auto' && chosenMode ? `Auto → ${displayMode?.label}` : displayMode?.label}
          </span>
          <span className="sm:hidden">{displayMode?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {ACCURACY_MODES.map((modeOption) => {
          const Icon = modeOption.icon;
          return (
            <DropdownMenuItem
              key={modeOption.key}
              onClick={() => handleModeChange(modeOption.key)}
              className="flex items-center gap-3 p-3"
            >
              <div className={`w-2 h-2 rounded-full ${modeOption.color}`} />
              <Icon className="w-4 h-4" />
              <div className="flex-1">
                <div className="font-medium">{modeOption.label}</div>
                <div className="text-xs text-muted-foreground">{modeOption.description}</div>
              </div>
              {mode === modeOption.key && (
                <Badge variant="secondary" className="text-xs">Active</Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccuracyToggle;