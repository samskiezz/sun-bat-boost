import { SavingsWizard } from "@/components/SavingsWizard";
import { publish } from "@/ai/orchestrator/bus";

interface HowMuchCanISaveProps {
  onApplyToROI?: (scenario: any) => void;
}

export default function HowMuchCanISave({ onApplyToROI }: HowMuchCanISaveProps) {
  const handleApplyToROI = (scenario: any) => {
    // Publish to message bus for BatteryRoi component to receive
    publish({ 
      topic: "savings.scenario", 
      scenario: scenario,
      confidence: 0.9,
      provenance: { model_id: "savings-wizard", version: "1.0" }
    } as any);
    
    // Call parent callback if provided
    if (onApplyToROI) {
      onApplyToROI(scenario);
    }
  };

  return (
    <SavingsWizard onApplyToROI={handleApplyToROI} />
  );
}