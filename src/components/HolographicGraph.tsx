import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface HolographicGraphProps {
  data: Array<{
    month: string;
    currentBill: number;
    newBill: number;
    savings: number;
  }>;
  title?: string;
}

export default function HolographicGraph({ data, title = "Energy Savings Analysis" }: HolographicGraphProps) {
  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5">
      {/* Holographic Background Effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-fade-in" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary/50 to-transparent animate-fade-in" />
      </div>
      
      {/* Floating Data Points */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [0.5, 1.2, 0.5],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <CardContent className="relative z-10 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {title}
          </h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="currentBillGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="newBillGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.3} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(255,255,255,0.1)" 
                strokeWidth={0.5}
              />
              <XAxis 
                dataKey="month" 
                stroke="rgba(255,255,255,0.7)" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.7)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              
              <Bar 
                dataKey="currentBill" 
                fill="url(#currentBillGradient)"
                radius={[4, 4, 0, 0]}
                filter="url(#glow)"
              />
              <Bar 
                dataKey="newBill" 
                fill="url(#newBillGradient)"
                radius={[4, 4, 0, 0]}
                filter="url(#glow)"
              />
            </BarChart>
          </ResponsiveContainer>
          
          {/* Legend with Glow Effects */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              <span className="text-muted-foreground">Current Bill</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <span className="text-muted-foreground">With Solar + Battery</span>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}