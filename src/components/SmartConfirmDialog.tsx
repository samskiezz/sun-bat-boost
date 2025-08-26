import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Zap, Hash, MapPin, Target, Brain, Shield } from 'lucide-react';
import { MatchHit, Product } from '@/utils/smartMatcher';

interface SmartConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: MatchHit[];
  onConfirm: (hit: MatchHit) => void;
  onCorrect: (falseHit: MatchHit, trueProduct: Product) => void;
  alternativeProducts: Product[]; // for correction dropdown
}

const SmartConfirmDialog: React.FC<SmartConfirmDialogProps> = ({
  isOpen,
  onClose,
  candidates,
  onConfirm,
  onCorrect,
  alternativeProducts
}) => {
  const [showAlternatives, setShowAlternatives] = React.useState(false);
  const [selectedAlternative, setSelectedAlternative] = React.useState<Product | null>(null);
  const topCandidate = candidates[0];

  if (!topCandidate) return null;

  const EvidenceChip = ({ 
    icon: Icon, 
    label, 
    active, 
    value 
  }: { 
    icon: any, 
    label: string, 
    active: boolean, 
    value?: number 
  }) => (
    <Badge 
      variant={active ? "default" : "secondary"} 
      className={`text-xs gap-1 ${active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
    >
      <Icon className="w-3 h-3" />
      {label}
      {value !== undefined && ` ${(value * 100).toFixed(0)}%`}
    </Badge>
  );

  const handleCorrection = () => {
    if (selectedAlternative) {
      onCorrect(topCandidate, selectedAlternative);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Smart Match Confirmation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Top Candidate */}
          <Card className="border-2 border-blue-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    {topCandidate.product.brand} {topCandidate.product.model}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Found: "{topCandidate.raw}"
                  </p>
                  {topCandidate.product.specs && (
                    <p className="text-sm text-blue-600 font-medium">
                      {topCandidate.product.power_rating && `${topCandidate.product.power_rating}W`}
                      {topCandidate.product.capacity_kwh && `${topCandidate.product.capacity_kwh}kWh`}
                      {topCandidate.product.specs.kW && `${topCandidate.product.specs.kW}kW`}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {(topCandidate.score * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-500">confidence</div>
                </div>
              </div>

              {/* Evidence Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                <EvidenceChip 
                  icon={Zap} 
                  label="Regex" 
                  active={topCandidate.evidence.regexHit} 
                />
                <EvidenceChip 
                  icon={Hash} 
                  label="Alias" 
                  active={topCandidate.evidence.aliasHit} 
                />
                <EvidenceChip 
                  icon={MapPin} 
                  label="Section" 
                  active={topCandidate.evidence.sectionBoost > 0}
                  value={topCandidate.evidence.sectionBoost}
                />
                <EvidenceChip 
                  icon={Target} 
                  label="Quantity" 
                  active={topCandidate.evidence.qtyBoost > 0}
                  value={topCandidate.evidence.qtyBoost}
                />
                <EvidenceChip 
                  icon={CheckCircle} 
                  label="Brand" 
                  active={topCandidate.evidence.brandNearby} 
                />
                <EvidenceChip 
                  icon={CheckCircle} 
                  label="Specs" 
                  active={topCandidate.evidence.specNearby} 
                />
                {topCandidate.evidence.ocrRiskPenalty > 0 && (
                  <EvidenceChip 
                    icon={Shield} 
                    label="OCR Risk" 
                    active={true}
                    value={topCandidate.evidence.ocrRiskPenalty}
                  />
                )}
              </div>

              {/* Alternative Candidates */}
              {candidates.length > 1 && (
                <div className="border-t pt-3">
                  <p className="text-sm text-gray-600 mb-2">Other candidates:</p>
                  <div className="space-y-1">
                    {candidates.slice(1, 3).map((hit, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{hit.product.brand} {hit.product.model}</span>
                        <span className="text-gray-500">{(hit.score * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={() => onConfirm(topCandidate)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Match
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="flex-1"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Choose Different
            </Button>
          </div>

          {/* Alternative Products Selector */}
          {showAlternatives && (
            <Card className="border-orange-200">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Select the correct product:</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {alternativeProducts
                    .filter(p => p.type === topCandidate.product.type)
                    .slice(0, 20) // Limit to prevent UI overload
                    .map((product) => (
                    <div 
                      key={product.id}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        selectedAlternative?.id === product.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedAlternative(product)}
                    >
                      <div className="font-medium">{product.brand} {product.model}</div>
                      {(product.power_rating || product.capacity_kwh || product.specs?.kW) && (
                        <div className="text-sm text-gray-600">
                          {product.power_rating && `${product.power_rating}W`}
                          {product.capacity_kwh && `${product.capacity_kwh}kWh`}
                          {product.specs?.kW && `${product.specs.kW}kW`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {selectedAlternative && (
                  <div className="mt-4 pt-4 border-t">
                    <Button 
                      onClick={handleCorrection}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      Correct to {selectedAlternative.brand} {selectedAlternative.model}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Learning Info */}
          <div className="text-xs text-gray-500 text-center bg-gray-50 p-2 rounded">
            🧠 This choice will help the system learn and improve future accuracy
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartConfirmDialog;