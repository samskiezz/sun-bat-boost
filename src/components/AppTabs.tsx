import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Battery, FileText, Sparkles } from "lucide-react";

const TABS = ["Rebates Calculator", "How much can I save?", "Battery ROI Calculator", "Bills & Quotes (OCR)"] as const;
type Tab = typeof TABS[number];

const tabIcons = {
  "Rebates Calculator": Calculator,
  "How much can I save?": Sparkles,
  "Battery ROI Calculator": Battery,
  "Bills & Quotes (OCR)": FileText,
};

interface AppTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const AppTabs: React.FC<AppTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="sticky top-0 z-20 mb-6">
      <div className="flex gap-2 p-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-2xl">
        {TABS.map((tab) => {
          const Icon = tabIcons[tab];
          return (
            <motion.button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`
                relative px-4 py-3 rounded-xl text-sm transition-all duration-200 flex items-center gap-2
                ${activeTab === tab 
                  ? "font-semibold text-foreground" 
                  : "opacity-70 hover:opacity-90 text-muted-foreground"
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab}</span>
              <span className="sm:hidden">
                {tab === "Rebates Calculator" && "Rebates"}
                {tab === "How much can I save?" && "Savings"}
                {tab === "Battery ROI Calculator" && "Battery ROI"}
                {tab === "Bills & Quotes (OCR)" && "OCR"}
              </span>
              
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute inset-0 rounded-xl bg-white/10 border border-white/30"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default AppTabs;