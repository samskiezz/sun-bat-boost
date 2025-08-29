import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DataPoint {
  month?: string;
  year?: number;
  currentBill?: number;
  newBill?: number;
  savings?: number;
  cumulative?: number;
  annual?: number;
  solarGeneration?: number;
  value?: number;
  name?: string;
  color?: string;
}

interface GlassmorphicChartProps {
  data: DataPoint[];
  type: 'monthly' | 'cumulative' | 'pie';
  title: string;
  subtitle?: string;
}

export default function GlassmorphicChart({ data, type, title, subtitle }: GlassmorphicChartProps) {
  if (type === 'monthly') {
    const maxValue = Math.max(...data.map(d => d.currentBill || 0));
    
    return (
      <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((item, index) => (
              <motion.div
                key={item.month}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{item.month}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-red-400">Current: ${item.currentBill?.toLocaleString()}</span>
                    <span className="text-blue-400">With Solar: ${item.newBill?.toLocaleString()}</span>
                    <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                      Saves ${item.savings?.toLocaleString()}
                    </Badge>
                  </div>
                </div>
                
                <div className="relative h-8 rounded-lg overflow-hidden bg-background/20">
                  {/* Current Bill Bar (Background) */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((item.currentBill || 0) / maxValue) * 100}%` }}
                    transition={{ delay: index * 0.1, duration: 0.8, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500/60 to-red-600/40 rounded-lg"
                  />
                  
                  {/* New Bill Bar (Foreground) */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((item.newBill || 0) / maxValue) * 100}%` }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.8, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500/80 to-blue-600/60 rounded-lg"
                  />
                  
                  {/* Solar Generation Indicator */}
                  {item.solarGeneration && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.4, duration: 0.5 }}
                      className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-r-lg"
                      title={`Solar Generation: ${item.solarGeneration.toLocaleString()} kWh`}
                    />
                  )}
                  
                  {/* Savings Highlight */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.6, duration: 0.3 }}
                    className="absolute top-1/2 -translate-y-1/2 right-2 px-2 py-0.5 bg-green-500/90 text-white text-xs font-bold rounded-full"
                  >
                    -${item.savings?.toLocaleString()}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 p-4 rounded-xl bg-background/10 border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-gradient-to-r from-red-500 to-red-600 rounded"></div>
              <span className="text-xs text-muted-foreground">Current Bill</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
              <span className="text-xs text-muted-foreground">With Solar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded"></div>
              <span className="text-xs text-muted-foreground">Solar Generation</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (type === 'cumulative') {
    const maxValue = Math.max(...data.map(d => d.cumulative || 0));
    
    return (
      <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="relative h-80 p-4">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
              <span>${(maxValue).toLocaleString()}</span>
              <span>${(maxValue * 0.75).toLocaleString()}</span>
              <span>${(maxValue * 0.5).toLocaleString()}</span>
              <span>${(maxValue * 0.25).toLocaleString()}</span>
              <span>$0</span>
            </div>
            
            {/* Chart area */}
            <div className="ml-16 h-full relative">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <div
                  key={ratio}
                  className="absolute w-full border-t border-white/10"
                  style={{ top: `${(1 - ratio) * 100}%` }}
                />
              ))}
              
              {/* Bars */}
              <div className="flex items-end justify-between h-full gap-1">
                {data.slice(0, 25).filter((_, i) => i % 5 === 4).map((item, index) => (
                  <motion.div
                    key={item.year}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ 
                      height: `${((item.cumulative || 0) / maxValue) * 100}%`,
                      opacity: 1 
                    }}
                    transition={{ delay: index * 0.1, duration: 0.8, ease: "easeOut" }}
                    className="relative flex-1 group cursor-pointer"
                  >
                    <div className="h-full bg-gradient-to-t from-green-600/80 via-green-500/60 to-green-400/80 rounded-t-lg backdrop-blur-sm border border-green-400/20 hover:from-green-500 hover:to-green-300 transition-all duration-300">
                      {/* Hover tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-background/90 backdrop-blur-xl border border-white/20 rounded-lg p-2 text-xs whitespace-nowrap">
                          <div className="font-semibold">Year {item.year}</div>
                          <div className="text-green-400">Total: ${item.cumulative?.toLocaleString()}</div>
                          <div className="text-blue-400">Annual: ${item.annual?.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Year label */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                      {item.year}
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* X-axis label */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                Years
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (type === 'pie') {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    let currentAngle = 0;
    
    return (
      <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Pie Chart */}
            <div className="relative w-48 h-48">
              <svg width="192" height="192" className="transform -rotate-90">
                {data.map((item, index) => {
                  const percentage = (item.value || 0) / total;
                  const angle = percentage * 360;
                  const radius = 80;
                  const centerX = 96;
                  const centerY = 96;
                  
                  // Calculate arc path
                  const startAngleRad = (currentAngle * Math.PI) / 180;
                  const endAngleRad = ((currentAngle + angle) * Math.PI) / 180;
                  
                  const x1 = centerX + radius * Math.cos(startAngleRad);
                  const y1 = centerY + radius * Math.sin(startAngleRad);
                  const x2 = centerX + radius * Math.cos(endAngleRad);
                  const y2 = centerY + radius * Math.sin(endAngleRad);
                  
                  const largeArc = angle > 180 ? 1 : 0;
                  
                  const pathData = [
                    `M ${centerX} ${centerY}`,
                    `L ${x1} ${y1}`,
                    `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                    'Z'
                  ].join(' ');
                  
                  const segment = (
                    <motion.path
                      key={`${item.name}-${index}`}
                      d={pathData}
                      fill={item.color}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="2"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 0.8, scale: 1 }}
                      transition={{ delay: index * 0.2, duration: 0.6, ease: "easeOut" }}
                      whileHover={{ opacity: 1, scale: 1.05 }}
                      className="cursor-pointer backdrop-blur-sm"
                    />
                  );
                  
                  currentAngle += angle;
                  return segment;
                })}
                
                {/* Center circle */}
                <circle
                  cx="96"
                  cy="96"
                  r="30"
                  fill="rgba(0,0,0,0.4)"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                />
              </svg>
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-lg font-bold">{total.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">kWh/year</div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="space-y-3 flex-1">
              {data.map((item, index) => (
                <motion.div
                  key={`legend-${item.name}-${index}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{item.value?.toLocaleString()} kWh</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(((item.value || 0) / total) * 100)}%
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return null;
}