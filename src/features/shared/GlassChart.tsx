import React from 'react';
import { cn } from "@/lib/utils";
import { tokens } from "@/theme/tokens";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from 'recharts';

interface GlassChartProps {
  type: 'line' | 'bar' | 'area';
  data: any[];
  children?: React.ReactNode;
  className?: string;
  height?: number;
  theme?: 'primary' | 'secondary' | 'success' | 'warning';
}

const themeColors = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))"
};

export function GlassChart({ 
  type, 
  data, 
  children, 
  className, 
  height = 300,
  theme = 'primary',
  ...props 
}: GlassChartProps) {
  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={cn(tokens.card, "p-3 border border-border/50 shadow-lg")}>
          <p className="text-sm font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const chartProps = {
    data,
    ...props
  };

  return (
    <div className={cn(tokens.card, "p-6", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <>
          {type === 'line' && (
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={customTooltip} />
              <Legend />
              {children}
            </LineChart>
          )}
          
          {type === 'bar' && (
            <BarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={customTooltip} />
              <Legend />
              {children}
            </BarChart>
          )}
          
          {type === 'area' && (
            <AreaChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={customTooltip} />
              <Legend />
              {children}
            </AreaChart>
          )}
        </>
      </ResponsiveContainer>
    </div>
  );
}

export const GlassLine = ({ dataKey, name, strokeWidth = 2, ...props }: any) => (
  <Line
    type="monotone"
    dataKey={dataKey}
    stroke="hsl(var(--primary))"
    strokeWidth={strokeWidth}
    name={name}
    {...props}
  />
);

export const GlassBar = ({ dataKey, name, ...props }: any) => (
  <Bar
    dataKey={dataKey}
    fill="hsl(var(--primary))"
    name={name}
    {...props}
  />
);

export const GlassArea = ({ dataKey, name, fillOpacity = 0.3, ...props }: any) => (
  <Area
    type="monotone"
    dataKey={dataKey}
    stroke="hsl(var(--primary))"
    fill="hsl(var(--primary))"
    fillOpacity={fillOpacity}
    name={name}
    {...props}
  />
);