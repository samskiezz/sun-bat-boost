import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface HeroHeaderProps {
  lastUpdated?: string;
}

export const HeroHeader = ({ lastUpdated }: HeroHeaderProps) => {
  return (
    <header className="text-center mb-8">
      <div className="mb-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Hilts Rebate Calculator
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Calculate your Australian solar, battery & VPP rebates instantly with CEC-approved data
        </p>
      </div>
      
      {lastUpdated && (
        <Badge variant="secondary" className="gap-2">
          <Calendar className="w-4 h-4" />
          Last updated: {lastUpdated}
        </Badge>
      )}
    </header>
  );
};