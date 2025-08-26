import { ExtractResult } from '@/ocr/extract';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Battery, Gauge } from 'lucide-react';

interface OCRResultDisplayProps {
  result: ExtractResult;
  onExtractComplete?: (data: any) => void;
}

export default function OCRResultDisplay({ result, onExtractComplete }: OCRResultDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        
        {/* Solar Panels */}
        {result.panels?.best && (
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Zap className="w-5 h-5" />
                Solar Panels Detected
                <Badge 
                  variant={result.panels.confidence === 'HIGH' ? 'default' : result.panels.confidence === 'MEDIUM' ? 'secondary' : 'destructive'}
                  className="ml-auto"
                >
                  {result.panels.confidence}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600">Brand:</span>
                  <span className="font-medium">{result.panels.best.brand || 'Unknown'}</span>
                </div>
                {result.panels.best.model && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600">Model:</span>
                    <span className="font-medium">{result.panels.best.model}</span>
                  </div>
                )}
                {result.panels.best.count && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600">Quantity:</span>
                    <span className="font-medium">{result.panels.best.count} panels</span>
                  </div>
                )}
                {result.panels.best.wattage && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600">Per Panel:</span>
                    <span className="font-medium">{result.panels.best.wattage}W</span>
                  </div>
                )}
                {result.panels.best.arrayKwDc && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600">Total Array:</span>
                    <span className="font-medium text-lg">{result.panels.best.arrayKwDc.toFixed(1)} kW DC</span>
                  </div>
                )}
              </div>
              
              {result.panels.best.syntheticProduct && (
                <Badge variant="outline" className="w-full text-purple-600 border-purple-300">
                  ✨ Created from Proposal Data
                </Badge>
              )}
              
              {result.panels?.warnings && result.panels.warnings.length > 0 && (
                <div className="space-y-1">
                  {result.panels.warnings.map((warning, i) => (
                    <div key={i} className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      ⚠️ {warning}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Battery Storage */}
        {result.battery?.best && (
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Battery className="w-5 h-5" />
                Battery Storage Detected
                <Badge 
                  variant={result.battery.confidence === 'HIGH' ? 'default' : result.battery.confidence === 'MEDIUM' ? 'secondary' : 'destructive'}
                  className="ml-auto"
                >
                  {result.battery.confidence}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">Brand:</span>
                  <span className="font-medium">{result.battery.best.brand || 'Unknown'}</span>
                </div>
                {result.battery.best.model && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Model:</span>
                    <span className="font-medium">{result.battery.best.model}</span>
                  </div>
                )}
                {result.battery.best.usableKWh && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Usable Capacity:</span>
                    <span className="font-medium text-lg">{result.battery.best.usableKWh} kWh</span>
                  </div>
                )}
                {result.battery.best.stack?.modules && result.battery.best.stack?.moduleKWh && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Configuration:</span>
                    <span className="font-medium">{result.battery.best.stack.modules}×{result.battery.best.stack.moduleKWh} kWh</span>
                  </div>
                )}
              </div>
              
              {result.battery.best.syntheticProduct && (
                <Badge variant="outline" className="w-full text-purple-600 border-purple-300">
                  ✨ Created from Proposal Data
                </Badge>
              )}
              
              {result.battery?.warnings && result.battery.warnings.length > 0 && (
                <div className="space-y-1">
                  {result.battery.warnings.map((warning, i) => (
                    <div key={i} className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      ⚠️ {warning}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Inverter */}
        {result.inverter?.value && (
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Gauge className="w-5 h-5" />
                Inverter Detected
                <Badge 
                  variant={result.inverter.confidence === 'HIGH' ? 'default' : result.inverter.confidence === 'MEDIUM' ? 'secondary' : 'destructive'}
                  className="ml-auto"
                >
                  {result.inverter.confidence}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {result.inverter.value.brandRaw && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-600">Brand:</span>
                    <span className="font-medium">{result.inverter.value.brandRaw}</span>
                  </div>
                )}
                {result.inverter.value.modelRaw && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-600">Model:</span>
                    <span className="font-medium">{result.inverter.value.modelRaw}</span>
                  </div>
                )}
                {result.inverter.value.ratedKw && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-600">Rating:</span>
                    <span className="font-medium text-lg">{result.inverter.value.ratedKw} kW</span>
                  </div>
                )}
                {result.inverter.value.phases && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-600">Phases:</span>
                    <span className="font-medium">{result.inverter.value.phases}</span>
                  </div>
                )}
              </div>
              
              <Badge variant="outline" className="w-full text-blue-600 border-blue-300">
                📝 Raw Text (No DB Match)
              </Badge>
              
              {result.inverter?.warnings && result.inverter.warnings.length > 0 && (
                <div className="space-y-1">
                  {result.inverter.warnings.map((warning, i) => (
                    <div key={i} className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      ⚠️ {warning}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Action Buttons */}
      {(result?.panels?.best || result?.battery?.best) && onExtractComplete && (
        <div className="flex justify-center">
          <Button 
            onClick={() => {
              console.log('🔧 Sending full ExtractResult:', result);
              onExtractComplete(result);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            ⚡ Use This Configuration
          </Button>
        </div>
      )}
    </div>
  );
}