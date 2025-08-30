import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Star, Zap, Battery, Award } from 'lucide-react';
import { useCECData } from '@/hooks/useCECData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductPickerEnhancedProps {
  type: 'panel' | 'battery';
  onProductSelect: (product: any) => void;
  selectedProduct?: any;
  systemKw?: number;
  recommendations?: any;
}

type ProductType = {
  brand: string;
  model: string;
  pmax?: number;
  efficiency?: number;
  capacity_kwh?: number;
  power_kw?: number; 
  technology?: string;
  vpp_compatible?: boolean;
};

export const ProductPickerEnhanced: React.FC<ProductPickerEnhancedProps> = ({
  type,
  onProductSelect,
  selectedProduct,
  systemKw = 0,
  recommendations
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'efficiency' | 'power' | 'brand'>('efficiency');
  const [filterBrand, setFilterBrand] = useState<string>('');
  
  const { 
    panels, 
    batteries, 
    loading, 
    error
  } = useCECData();

  const products = type === 'panel' ? panels : batteries;
  
  // Get unique brands from products
  const availableBrands = useMemo(() => {
    if (!products || products.length === 0) return [];
    return [...new Set(products.map(p => p.brand))].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    let filtered = products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.model.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBrand = !filterBrand || product.brand === filterBrand;
      
      return matchesSearch && matchesBrand;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'efficiency':
          if (type === 'panel') {
            const aEff = (a as any).efficiency || 0;
            const bEff = (b as any).efficiency || 0;
            return bEff - aEff;
          }
          return 0;
        case 'power':
          if (type === 'panel') {
            const aPower = (a as any).pmax || 0;
            const bPower = (b as any).pmax || 0;
            return bPower - aPower;
          } else {
            const aCap = (a as any).capacity_kwh || 0;
            const bCap = (b as any).capacity_kwh || 0;
            return bCap - aCap;
          }
        case 'brand':
          return a.brand.localeCompare(b.brand);
        default:
          return 0;
      }
    });

    return filtered.slice(0, 50); // Limit to 50 results for performance
  }, [products, searchTerm, sortBy, filterBrand, type]);

  const getRecommendationBadge = (product: any) => {
    if (!recommendations) return null;
    
    if (type === 'panel' && recommendations.panels?.recommended_model === product.model) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Award className="h-3 w-3 mr-1" />AI Recommended</Badge>;
    }
    
    if (type === 'battery' && recommendations.battery?.recommended_model === product.model) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Award className="h-3 w-3 mr-1" />AI Recommended</Badge>;
    }
    
    return null;
  };

  const calculatePanelFit = (panelWatts: number) => {
    if (!systemKw || systemKw === 0) return null;
    const systemWatts = systemKw * 1000;
    const panelCount = Math.ceil(systemWatts / panelWatts);
    return { panelCount, totalWatts: panelCount * panelWatts };
  };

  if (loading) {
    return (
      <Card className="border-white/20 bg-white/5">
        <CardContent className="p-6">
          <div className="text-center">Loading {type === 'panel' ? 'panels' : 'batteries'}...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/10">
        <CardContent className="p-6">
          <div className="text-center text-red-400">
            Failed to load products. Using cached data may be available.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/20 bg-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'panel' ? <Zap className="h-5 w-5" /> : <Battery className="h-5 w-5" />}
          Select {type === 'panel' ? 'Solar Panel' : 'Battery'} from CEC Database
        </CardTitle>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${type === 'panel' ? 'panels' : 'batteries'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px] bg-white/10 border-white/20">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="efficiency">
                {type === 'panel' ? 'Efficiency' : 'Capacity'}
              </SelectItem>
              <SelectItem value="power">
                {type === 'panel' ? 'Power (Watts)' : 'Power (kWh)'}
              </SelectItem>
              <SelectItem value="brand">Brand</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterBrand} onValueChange={setFilterBrand}>
            <SelectTrigger className="w-[150px] bg-white/10 border-white/20">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Brands</SelectItem>
              {availableBrands.map(brand => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No products found matching your criteria
          </div>
        ) : (
          filteredProducts.map((product, index) => {
            const isSelected = selectedProduct?.model === product.model;
            const panelFit = type === 'panel' ? calculatePanelFit((product as any).pmax || 0) : null;
            
            return (
              <Card 
                key={`${product.brand}-${product.model}-${index}`}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'border-blue-500/50 bg-blue-500/10' 
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
                onClick={() => onProductSelect(product)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-sm">{product.brand} {product.model}</h4>
                        {getRecommendationBadge(product)}
                        {isSelected && <Badge className="bg-blue-500/20 text-blue-400">Selected</Badge>}
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {type === 'panel' ? (
                          <>
                            <div>
                              <span className="text-muted-foreground">Power:</span>
                              <div className="font-semibold text-orange-400">{(product as any).pmax || 0}W</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Efficiency:</span>
                              <div className="font-semibold text-green-400">{(product as any).efficiency || 0}%</div>
                            </div>
                            {panelFit && (
                              <>
                                <div>
                                  <span className="text-muted-foreground">Panels Needed:</span>
                                  <div className="font-semibold text-blue-400">{panelFit.panelCount}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total System:</span>
                                  <div className="font-semibold text-purple-400">{(panelFit.totalWatts/1000).toFixed(1)}kW</div>
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-muted-foreground">Capacity:</span>
                              <div className="font-semibold text-orange-400">{(product as any).capacity_kwh || 0}kWh</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Power:</span>
                              <div className="font-semibold text-green-400">{(product as any).power_kw || 0}kW</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Type:</span>
                              <div className="font-semibold text-blue-400">{(product as any).technology || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">VPP:</span>
                              <div className="font-semibold text-purple-400">
                                {(product as any).vpp_compatible ? 'Yes' : 'No'}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className="ml-4"
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};