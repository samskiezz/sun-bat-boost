import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Database, Zap, Brain } from 'lucide-react';
import { generateComprehensiveProducts } from '@/utils/comprehensiveProductGenerator';
import { Product } from '@/utils/smartMatcher';

const DebugProductPatterns: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    panels: number;
    batteries: number;
    inverters: number;
    brands: number;
  }>({ total: 0, panels: 0, batteries: 0, inverters: 0, brands: 0 });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const allProducts = await generateComprehensiveProducts();
      setProducts(allProducts);
      
      const panels = allProducts.filter(p => p.type === 'panel').length;
      const batteries = allProducts.filter(p => p.type === 'battery').length;
      const inverters = allProducts.filter(p => p.type === 'inverter').length;
      const brands = new Set(allProducts.map(p => p.brand)).size;
      
      setStats({
        total: allProducts.length,
        panels,
        batteries,
        inverters,
        brands
      });
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const productsByType = {
    panel: products.filter(p => p.type === 'panel'),
    battery: products.filter(p => p.type === 'battery'),
    inverter: products.filter(p => p.type === 'inverter')
  };

  const productsByBrand = products.reduce((acc, product) => {
    if (!acc[product.brand]) {
      acc[product.brand] = [];
    }
    acc[product.brand].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Comprehensive Product Database Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.panels}</div>
              <div className="text-sm text-gray-600">Solar Panels</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.batteries}</div>
              <div className="text-sm text-gray-600">Batteries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.inverters}</div>
              <div className="text-sm text-gray-600">Inverters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.brands}</div>
              <div className="text-sm text-gray-600">Brands</div>
            </div>
          </div>

          <Button onClick={loadProducts} disabled={loading} className="mb-4">
            {loading ? 'Loading...' : 'Refresh Database'}
          </Button>

          {/* Products by Type */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Products by Type</h3>
            
            {Object.entries(productsByType).map(([type, typeProducts]) => (
              <Collapsible key={type} className="space-y-2">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      {type === 'panel' && <div className="w-3 h-3 bg-yellow-400 rounded"></div>}
                      {type === 'battery' && <div className="w-3 h-3 bg-green-400 rounded"></div>}
                      {type === 'inverter' && <div className="w-3 h-3 bg-purple-400 rounded"></div>}
                      {type.charAt(0).toUpperCase() + type.slice(1)}s ({typeProducts.length})
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2">
                  <div className="grid gap-2 max-h-60 overflow-y-auto">
                    {typeProducts.slice(0, 50).map((product, idx) => (
                      <div key={`${product.id}-${idx}`} className="p-3 border rounded-md bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {product.brand} - {product.model}
                            </div>
                            {product.regex && (
                              <div className="text-xs text-gray-600 font-mono mt-1 break-all">
                                Regex: {product.regex}
                              </div>
                            )}
                            {product.aliases && product.aliases.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {product.aliases.slice(0, 3).map((alias, aliasIdx) => (
                                  <Badge key={aliasIdx} variant="secondary" className="text-xs">
                                    {alias}
                                  </Badge>
                                ))}
                                {product.aliases.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{product.aliases.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            {product.power_rating && `${product.power_rating}W`}
                            {product.capacity_kwh && `${product.capacity_kwh}kWh`}
                          </div>
                        </div>
                      </div>
                    ))}
                    {typeProducts.length > 50 && (
                      <div className="text-center text-sm text-gray-500 py-2">
                        ... and {typeProducts.length - 50} more {type}s
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

          {/* Top Brands */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Top Brands</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(productsByBrand)
                .sort(([,a], [,b]) => b.length - a.length)
                .slice(0, 20)
                .map(([brand, brandProducts]) => (
                  <Badge key={brand} variant="outline" className="text-sm">
                    {brand} ({brandProducts.length})
                  </Badge>
                ))}
            </div>
          </div>

          {/* Pattern Quality Indicators */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Pattern Quality
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Products with Regex:</span>
                <span className="ml-2 font-medium">
                  {products.filter(p => p.regex).length} / {products.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Products with Aliases:</span>
                <span className="ml-2 font-medium">
                  {products.filter(p => p.aliases && p.aliases.length > 0).length} / {products.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Avg Aliases per Product:</span>
                <span className="ml-2 font-medium">
                  {(products.reduce((sum, p) => sum + (p.aliases?.length || 0), 0) / products.length).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugProductPatterns;