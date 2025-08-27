import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Battery, Sparkles, FileText } from "lucide-react";

type Tab = "Rebates Calculator" | "How much can I save?" | "Battery ROI Calculator" | "OCR Demo";

interface AppTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  showOCRDemo?: boolean;
}

export const AppTabs: React.FC<AppTabsProps> = ({ activeTab, onTabChange, showOCRDemo }) => {
  const tabs = [
    { id: "Rebates Calculator" as Tab, label: "Rebates Calculator", icon: Calculator },
    { id: "How much can I save?" as Tab, label: "How Much Can I Save?", icon: Sparkles },
    { id: "Battery ROI Calculator" as Tab, label: "Battery ROI Calculator", icon: Battery },
    ...(showOCRDemo ? [{ id: "OCR Demo" as Tab, label: "OCR Demo", icon: FileText }] : [])
  ];

  return (
    <div className="sticky top-0 z-20 mb-6">
      <div className="flex gap-2 p-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative px-4 py-3 rounded-xl text-sm transition-all duration-200 flex items-center gap-2
                ${activeTab === tab.id 
                  ? "font-semibold text-foreground" 
                  : "opacity-70 hover:opacity-90 text-muted-foreground"
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === "Rebates Calculator" && "Rebates"}
                {tab.id === "How much can I save?" && "Savings"}
                {tab.id === "Battery ROI Calculator" && "Battery ROI"}
                {tab.id === "OCR Demo" && "OCR"}
              </span>
              
              {activeTab === tab.id && (
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