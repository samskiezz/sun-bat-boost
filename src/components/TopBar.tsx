import React from "react";
import { AccuracyToggle } from "./AccuracyToggle";
import { SystemManagerButton } from "./SystemManagerButton";
import { LiteProToggle } from "./LiteProToggle";
import { Glass } from "./Glass";

interface TopBarProps {
  userTier: 'free' | 'lite' | 'pro';
  onTierChange: (tier: 'lite' | 'pro') => void;
  devMode?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ userTier, onTierChange, devMode }) => {
  return (
    <Glass className="sticky top-0 z-50 mb-6">
      <div className="flex items-center justify-between p-3 gap-3">
        <div className="text-sm opacity-80 font-medium">Hilts Energy Intelligence</div>
        <div className="flex items-center gap-2">
          <AccuracyToggle />
          <SystemManagerButton />
          <LiteProToggle 
            currentTier={userTier} 
            onTierChange={onTierChange}
            devMode={devMode}
          />
        </div>
      </div>
    </Glass>
  );
};

export default TopBar;