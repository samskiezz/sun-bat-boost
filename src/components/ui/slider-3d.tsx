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
  gradient?: 'solar' | 'battery' | 'default';
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
  gradient = 'default'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const percentage = ((value - min) / (max - min)) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateValue(e);
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
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        updateValue(e);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, min, max, step, onChange]);

  // Generate preset marks - fewer marks for cleaner look
  const numPresets = Math.min(5, Math.ceil((max - min) / (step * 4)));
  const presets = [];
  for (let i = 0; i < numPresets; i++) {
    const preset = min + (i / (numPresets - 1)) * (max - min);
    presets.push(Math.round(preset / step) * step);
  }

  // Gradient styles based on type
  const gradientStyles = {
    solar: 'from-orange-400 via-yellow-400 to-orange-600',
    battery: 'from-green-400 via-emerald-400 to-green-600', 
    default: 'from-primary via-primary-glow to-primary'
  };

  const selectedGradient = gradientStyles[gradient] || gradientStyles.default;

  return (
    <div className={`relative ${className}`}>
      {/* Glassmorphism Container */}
      <div 
        className="backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-3xl p-8 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
      >
        {/* Holographic Background Animation */}
        <div 
          className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none"
          style={{
            background: `
              linear-gradient(45deg, transparent 30%, rgba(120,119,198,0.3) 50%, transparent 70%),
              linear-gradient(-45deg, transparent 30%, rgba(255,119,198,0.3) 50%, transparent 70%),
              linear-gradient(90deg, rgba(119,198,255,0.3) 0%, rgba(198,119,255,0.3) 100%)
            `,
            animation: 'holographic 3s ease-in-out infinite alternate'
          }}
        />

        <div className="relative space-y-8">
          {/* Value Display */}
          <div className="text-center space-y-3">
            <h3 className="text-lg font-medium text-foreground/80 tracking-wide">{label}</h3>
            <div 
              className={`text-5xl font-bold bg-gradient-to-r ${selectedGradient} bg-clip-text text-transparent transition-all duration-500 ${
                isHovered || isDragging ? 'scale-110 drop-shadow-lg' : 'scale-100'
              }`}
              style={{
                filter: isHovered || isDragging ? 'drop-shadow(0 0 20px rgba(255,255,255,0.5))' : 'none'
              }}
            >
              {value} {unit}
            </div>
          </div>

          {/* Holographic Slider Track */}
          <div className="relative px-2">
            <div
              ref={sliderRef}
              className="relative h-12 cursor-pointer select-none"
              onMouseDown={handleMouseDown}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Background Track with Glassmorphism */}
              <div 
                className="absolute top-1/2 left-0 right-0 h-4 -translate-y-1/2 rounded-full border border-white/30 overflow-hidden"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(255,255,255,0.2)'
                }}
              >
                {/* Shimmer effect */}
                <div 
                  className="absolute inset-0 -skew-x-12 w-6 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  style={{
                    animation: `shimmer 2s infinite linear`,
                    left: '-100%'
                  }}
                />
              </div>

              {/* Progress Track with Holographic Gradient */}
              <div
                className={`absolute top-1/2 left-0 h-4 -translate-y-1/2 rounded-full transition-all duration-300 overflow-hidden ${
                  isHovered || isDragging ? 'shadow-2xl' : 'shadow-lg'
                }`}
                style={{ 
                  width: `${percentage}%`,
                  background: `linear-gradient(90deg, 
                    hsl(var(--primary)) 0%, 
                    hsl(var(--primary-glow)) 50%, 
                    hsl(var(--primary)) 100%)`,
                  boxShadow: isHovered || isDragging 
                    ? `0 0 30px hsl(var(--primary) / 0.6), inset 0 1px 3px rgba(255,255,255,0.3)` 
                    : `0 0 15px hsl(var(--primary) / 0.3), inset 0 1px 3px rgba(255,255,255,0.3)`
                }}
              >
                {/* Inner glow */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 via-white/10 to-transparent"></div>
                {/* Animated particles */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `radial-gradient(circle at ${percentage}% 50%, rgba(255,255,255,0.8) 0%, transparent 20%)`
                  }}
                />
              </div>

              {/* Crystal Orb Thumb */}
              <div
                className={`absolute top-1/2 w-10 h-10 -translate-y-1/2 -translate-x-1/2 cursor-grab transition-all duration-300 ${
                  isDragging ? 'cursor-grabbing scale-125' : ''
                } ${
                  isHovered ? 'scale-110' : ''
                }`}
                style={{ 
                  left: `${percentage}%`,
                  filter: isHovered || isDragging ? 'drop-shadow(0 0 25px rgba(255,255,255,0.8))' : 'drop-shadow(0 0 15px rgba(255,255,255,0.4))'
                }}
              >
                {/* Main orb */}
                <div 
                  className="w-full h-full rounded-full border border-white/50"
                  style={{
                    background: `
                      radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 30%, transparent 60%),
                      linear-gradient(135deg, hsl(var(--primary) / 0.8) 0%, hsl(var(--primary-glow) / 0.6) 100%)
                    `,
                    boxShadow: `
                      0 0 20px hsl(var(--primary) / 0.6),
                      inset 0 1px 8px rgba(255,255,255,0.3),
                      inset 0 -1px 4px rgba(0,0,0,0.1)
                    `
                  }}
                >
                  {/* Inner reflection */}
                  <div 
                    className="absolute inset-1 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6) 0%, transparent 50%)'
                    }}
                  />
                  
                  {/* Core glow */}
                  <div 
                    className={`absolute inset-2 rounded-full transition-opacity duration-300 ${
                      isHovered || isDragging ? 'opacity-100' : 'opacity-60'
                    }`}
                    style={{
                      background: `radial-gradient(circle, hsl(var(--primary-glow) / 0.8) 0%, transparent 70%)`,
                      animation: isDragging ? 'pulse 1s infinite' : 'none'
                    }}
                  />
                </div>
                
                {/* Floating value tooltip */}
                <div className={`absolute -top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl backdrop-blur-md border border-white/30 text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                  isDragging || isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
                }`}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                  <span className={`bg-gradient-to-r ${selectedGradient} bg-clip-text text-transparent`}>
                    {value} {unit}
                  </span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/30"></div>
                </div>
              </div>
            </div>

            {/* Preset Marks */}
            <div className="relative mt-6">
              <div className="flex justify-between items-center">
                {presets.map((preset) => {
                  const isActive = Math.abs(value - preset) < step;
                  return (
                    <button
                      key={preset}
                      onClick={() => onChange(preset)}
                      className={`flex flex-col items-center space-y-2 text-xs font-medium transition-all duration-300 ${
                        isActive 
                          ? 'scale-110' 
                          : 'hover:scale-105 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div 
                        className={`w-3 h-3 rounded-full transition-all duration-300 border-2 ${
                          isActive 
                            ? `bg-gradient-to-r ${selectedGradient} border-white/50 shadow-lg` 
                            : 'bg-white/20 border-white/30 hover:bg-white/30'
                        }`}
                        style={{
                          boxShadow: isActive ? `0 0 15px hsl(var(--primary) / 0.5)` : 'none'
                        }}
                      />
                      <span className={`${isActive ? `bg-gradient-to-r ${selectedGradient} bg-clip-text text-transparent font-bold` : 'text-muted-foreground'}`}>
                        {preset}{preset === 0 ? '' : unit.charAt(0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Range Display */}
          <div className="flex justify-between text-sm text-muted-foreground/80 font-medium mt-4">
            <span>{min} {unit}</span>
            <span>{max} {unit}</span>
          </div>
        </div>
      </div>

      {/* Add required keyframes */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes holographic {
          0% { opacity: 0.2; transform: translateX(-10px); }
          50% { opacity: 0.4; transform: translateX(0px); }
          100% { opacity: 0.2; transform: translateX(10px); }
        }
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}} />
    </div>
  );
};