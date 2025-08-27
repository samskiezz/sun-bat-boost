import AccuracyToggle from "./AccuracyToggle";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Glass } from "./Glass";
import { useNavigate } from "react-router-dom";

export default function TopBar() {
  const navigate = useNavigate();

  const handleSystemManagerClick = () => {
    navigate('/system');
  };

  return (
    <Glass className="sticky top-0 z-50 mb-6">
      <div className="flex items-center justify-between p-4">
        <div className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Hilts Energy Intelligence
        </div>
        <div className="flex items-center gap-3">
          <AccuracyToggle />
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSystemManagerClick}
            className="border border-white/20 bg-white/10 backdrop-blur-xl hover:bg-white/20"
          >
            <Settings className="w-4 h-4 mr-2" />
            System Manager
          </Button>
        </div>
      </div>
    </Glass>
  );
}