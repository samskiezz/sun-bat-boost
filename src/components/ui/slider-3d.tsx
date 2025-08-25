import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface Slider3DProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  label: string;
  unit: string;
  className?: string;
  gradient?: string;
}

export const Slider3D: React.FC<Slider3DProps> = ({
  min,
  max,
  step,
  value,
  onChange,
  label,
  unit,
  className = '',
  gradient = 'bg-gradient-primary'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const percentage = ((value - min) / (max - min)) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateValue(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateValue(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateValue = (e: MouseEvent | React.MouseEvent) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newValue = min + (max - min) * percentage;
    const steppedValue = Math.round(newValue / step) * step;
    
    onChange(Math.max(min, Math.min(max, steppedValue)));
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Generate preset marks
  const presets = [];
  for (let i = min; i <= max; i += step * 2) {
    presets.push(i);
  }

  return (
    <Card className={`p-6 ${className} backdrop-blur-sm bg-gradient-glass border-white/20 hover:shadow-glow transition-all duration-300`}>
      <div className="space-y-6">
        {/* Label and Value Display */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{label}</h3>
          <div 
            className={`text-4xl font-bold ${gradient} bg-clip-text text-transparent transition-all duration-300 ${
              isHovered || isDragging ? 'scale-110' : 'scale-100'
            }`}
          >
            {value} {unit}
          </div>
        </div>

        {/* 3D Slider Track */}
        <div className="relative px-4">
          <div
            ref={sliderRef}
            className="relative h-8 cursor-pointer select-none"
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Background Track with 3D effect */}
            <div className="absolute top-1/2 left-0 right-0 h-3 -translate-y-1/2 bg-gradient-to-r from-muted via-muted/80 to-muted rounded-full shadow-inner border border-border/50">
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent"></div>
            </div>

            {/* Progress Track */}
            <div
              className={`absolute top-1/2 left-0 h-3 -translate-y-1/2 ${gradient} rounded-full shadow-lg transition-all duration-300 ${
                isHovered || isDragging ? 'shadow-glow' : ''
              }`}
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent"></div>
            </div>

            {/* Floating Thumb */}
            <div
              className={`absolute top-1/2 w-8 h-8 -translate-y-1/2 -translate-x-1/2 ${gradient} rounded-full shadow-xl cursor-grab transition-all duration-300 ${
                isDragging ? 'cursor-grabbing scale-125 shadow-glow' : ''
              } ${
                isHovered ? 'scale-110' : ''
              }`}
              style={{ left: `${percentage}%` }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent"></div>
              <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/20 to-transparent"></div>
              
              {/* Floating value tooltip */}
              <div className={`absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-card border border-border rounded-lg shadow-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                isDragging || isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                {value} {unit}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border"></div>
              </div>
            </div>
          </div>

          {/* Preset Marks */}
          <div className="relative mt-4">
            <div className="flex justify-between items-center">
              {presets.map((preset) => {
                const presetPercentage = ((preset - min) / (max - min)) * 100;
                return (
                  <button
                    key={preset}
                    onClick={() => onChange(preset)}
                    className={`flex flex-col items-center space-y-1 text-xs transition-all duration-200 ${
                      Math.abs(value - preset) < step / 2 
                        ? 'text-primary font-semibold scale-110' 
                        : 'text-muted-foreground hover:text-foreground hover:scale-105'
                    }`}
                  >
                    <div 
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        Math.abs(value - preset) < step / 2 
                          ? gradient + ' shadow-glow' 
                          : 'bg-muted-foreground/50 hover:bg-foreground/50'
                      }`}
                    />
                    <span>{preset}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Range Display */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{min} {unit}</span>
          <span>{max} {unit}</span>
        </div>
      </div>
    </Card>
  );
};