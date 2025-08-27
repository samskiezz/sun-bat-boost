import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface LiteProToggleProps {
  currentTier: 'free' | 'lite' | 'pro';
  onTierChange: (tier: 'lite' | 'pro') => void;
  devMode?: boolean;
}

export const LiteProToggle: React.FC<LiteProToggleProps> = ({ 
  currentTier, 
  onTierChange, 
  devMode 
}) => {
  const handleUpgrade = (tier: 'lite' | 'pro') => {
    onTierChange(tier);
  };

  const getTierIcon = () => {
    switch (currentTier) {
      case 'pro': return Crown;
      case 'lite': return Zap;
      case 'free': return Users;
    }
  };

  const getTierColor = () => {
    switch (currentTier) {
      case 'pro': return 'bg-gradient-to-r from-purple-600 to-indigo-600';
      case 'lite': return 'bg-blue-600';
      case 'free': return 'bg-gray-600';
    }
  };

  const Icon = getTierIcon();

  if (devMode && currentTier !== 'free') {
    return (
      <Badge variant="outline" className="gap-1">
        <Crown className="w-3 h-3" />
        Pro (Dev)
      </Badge>
    );
  }

  if (currentTier === 'pro') {
    return (
      <Badge className="gap-1 bg-gradient-to-r from-purple-600 to-indigo-600">
        <Crown className="w-3 h-3" />
        Pro
      </Badge>
    );
  }

  if (currentTier === 'lite') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Lite</span>
            <span className="sm:hidden">L</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleUpgrade('pro')}>
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Pro
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Free tier
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Free</span>
          <span className="sm:hidden">F</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleUpgrade('lite')}>
          <Zap className="w-4 h-4 mr-2" />
          Upgrade to Lite
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleUpgrade('pro')}>
          <Crown className="w-4 h-4 mr-2" />
          Upgrade to Pro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LiteProToggle;