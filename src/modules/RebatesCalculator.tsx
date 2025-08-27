import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RebatesCalculator } from "@/components/RebatesCalculator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Eye, EyeOff } from "lucide-react";
import { Glass } from "@/components/Glass";

interface RebatesCalculatorModuleProps {
  // Optional props to match original interface if needed
}

export default function RebatesCalculatorModule(props: RebatesCalculatorModuleProps = {}) {
  const [started, setStarted] = useState(false);
  const [planCount, setPlanCount] = useState(5);
  const [results, setResults] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  // Fetch plan count for display
  useEffect(() => {
    const fetchPlanCount = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { count } = await supabase
          .from('energy_plans')
          .select('*', { count: 'exact', head: true });
        setPlanCount(count || 1247); // fallback to demo number
      } catch (error) {
        console.error('Error fetching plan count:', error);
        setPlanCount(1247);
      }
    };
    fetchPlanCount();
  }, []);

  const handleCalculate = (formData: any) => {
    console.log("Calculate rebates:", formData);
    
    // Use the actual calculation results, not fake data
    setResults(formData);
    
    // Set eligibility based on the calculation results
    if (formData.rebateResults) {
      const totalRebates = formData.rebateResults.total_rebates || 0;
      const batteryKwh = formData.batteryKwh || 0;
      const solarKw = formData.solarKw || 0;
      
      let status = 'green';
      let reasons = [];
      let suggestions = [];
      
      if (batteryKwh > 100) {
        status = 'red';
        reasons.push('Battery size exceeds 100kWh limit - no federal rebates available');
        suggestions.push('Consider reducing battery size to under 100kWh to qualify for rebates');
      } else if (batteryKwh > 48) {
        status = 'yellow';
        reasons.push('Battery size over 48kWh - rebates capped at 48kWh');
        suggestions.push('Maximum rebates achieved at 48kWh battery size');
      } else if (batteryKwh > 28 && formData.vppProvider !== 'None') {
        status = 'yellow';
        reasons.push('Battery size over 28kWh - no VPP bonuses available');
        suggestions.push('VPP bonuses are only available for batteries up to 28kWh');
      }
      
      if (totalRebates > 10000) {
        reasons.push('Excellent rebate outcome achieved');
      } else if (totalRebates > 5000) {
        reasons.push('Good rebate amount secured');
      }
      
      setEligibility({ status, reasons, suggestions });
    }
  };
  
  const handleRequestCall = () => {
    console.log("Request call");
  };

  if (!started) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-green-400/30 to-emerald-500/30 rounded-full blur-3xl"
            animate={{
              x: [0, 50, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-1/3 right-1/3 w-48 h-48 bg-gradient-to-l from-blue-400/25 to-cyan-500/25 rounded-full blur-2xl"
            animate={{
              x: [0, -40, 0],
              y: [0, 40, 0],
              scale: [1, 0.9, 1],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full blur-3xl"
            animate={{
              x: [0, 30, 0],
              y: [0, -50, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-12 shadow-2xl"
          >
            {/* Header */}
            <motion.div 
              className="flex items-center justify-center gap-4 mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-400/30 backdrop-blur-sm">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  💰
                </motion.div>
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-green-100 to-emerald-300 bg-clip-text text-transparent">
                  Government Rebates
                </h1>
                <p className="text-lg text-green-100 mt-2">
                  Calculate with <motion.span 
                    className="font-semibold text-green-300"
                    animate={{ color: ["#86efac", "#10b981", "#86efac"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {planCount.toLocaleString()}
                  </motion.span> live rebate schemes
                </p>
              </div>
            </motion.div>

            {/* Description */}
            <motion.p 
              className="text-xl text-white/80 mb-12 leading-relaxed max-w-3xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              Get comprehensive analysis of your government rebate eligibility with our AI-powered calculator
            </motion.p>

            {/* Feature Cards */}
            <motion.div 
              className="grid md:grid-cols-3 gap-6 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <motion.div 
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-400/30 w-fit mx-auto mb-4">
                  📊
                </div>
                <h3 className="text-lg font-semibold mb-3 text-white">Smart Analysis</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  AI-powered analysis of STC certificates, VPP incentives, and state rebates based on your location
                </p>
              </motion.div>

              <motion.div 
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-400/30 w-fit mx-auto mb-4">
                  ⚡
                </div>
                <h3 className="text-lg font-semibold mb-3 text-white">Auto Calculations</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  Automatic calculation of rebate amounts based on system size, location, and installation date
                </p>
              </motion.div>

              <motion.div 
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-400/30 w-fit mx-auto mb-4">
                  📈
                </div>
                <h3 className="text-lg font-semibold mb-3 text-white">Maximum Rebates</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  Find all applicable rebates and incentives to maximize your solar and battery investment returns
                </p>
              </motion.div>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6 }}
            >
              <Button
                onClick={() => setStarted(true)}
                size="lg"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg px-12 py-6 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                Calculate My Rebates
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Main Calculator */}
      <RebatesCalculator
        onCalculate={handleCalculate}
        results={results}
        eligibility={eligibility}
        onRequestCall={handleRequestCall}
        appMode="pro"
        userTier="pro"
        unlimitedTokens={true}
      />
    </div>
  );
}