import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Sparkles, Zap, Crown, Users } from 'lucide-react';

interface PricingTiersProps {
  currentTier: 'free' | 'lite' | 'pro';
  onTierSelect: (tier: 'lite' | 'pro') => void;
  onSignUp: () => void;
  onUpgrade: () => void;
}

const PricingTiers: React.FC<PricingTiersProps> = ({
  currentTier,
  onTierSelect,
  onSignUp,
  onUpgrade
}) => {
  const features = {
    free: [
      { name: 'Basic rebate calculator', included: true },
      { name: 'Current solar & battery rebates', included: true },
      { name: '3 calculations per day', included: true },
      { name: 'Basic eligibility check', included: true },
      { name: 'AI recommendations', included: false },
      { name: 'Product comparison', included: false },
      { name: 'Optimized system sizing', included: false },
      { name: 'Priority support', included: false }
    ],
    lite: [
      { name: 'Unlimited calculations', included: true },
      { name: 'Advanced rebate analysis', included: true },
      { name: 'State-by-state comparison', included: true },
      { name: 'Basic AI suggestions', included: true },
      { name: 'Product database access', included: true },
      { name: 'Email support', included: true },
      { name: 'Advanced AI optimization', included: false },
      { name: 'Live chat support', included: false }
    ],
    pro: [
      { name: 'Everything in Lite', included: true },
      { name: 'Advanced AI Optimizer', included: true },
      { name: 'Real-time system analysis', included: true },
      { name: 'ROI optimization engine', included: true },
      { name: 'Multi-scenario comparison', included: true },
      { name: 'Priority live chat support', included: true },
      { name: 'Custom reporting', included: true },
      { name: 'API access', included: true }
    ]
  };

  return (
    <div className="py-12 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Choose Your Solar Calculator Experience
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get accurate rebate calculations with the level of AI assistance that's right for you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Tier */}
          <Card className={`relative border-2 ${currentTier === 'free' ? 'border-gray-400 bg-gray-50' : 'border-gray-200'}`}>
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-gray-600 mr-2" />
                <CardTitle className="text-xl">Free</CardTitle>
              </div>
              <div className="text-3xl font-bold text-gray-900">$0</div>
              <p className="text-gray-600">Try it out</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {features.free.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={feature.included ? 'text-gray-900' : 'text-gray-400'}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={currentTier === 'free'}
                >
                  {currentTier === 'free' ? 'Current Plan' : 'Use Free Version'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lite Tier */}
          <Card className={`relative border-2 ${currentTier === 'lite' ? 'border-blue-500 bg-blue-50' : 'border-blue-200'}`}>
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center mb-2">
                <Zap className="w-6 h-6 text-blue-600 mr-2" />
                <CardTitle className="text-xl flex items-center gap-2">
                  Lite
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Popular
                  </Badge>
                </CardTitle>
              </div>
              <div className="text-3xl font-bold text-blue-900">Free</div>
              <p className="text-blue-600">With account signup</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {features.lite.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={feature.included ? 'text-gray-900' : 'text-gray-400'}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="pt-4">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => currentTier === 'lite' ? undefined : onSignUp()}
                  disabled={currentTier === 'lite'}
                >
                  {currentTier === 'lite' ? 'Current Plan' : 'Sign Up Free'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className={`relative border-2 ${currentTier === 'pro' ? 'border-purple-500 bg-purple-50' : 'border-purple-200'}`}>
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1">
                <Crown className="w-3 h-3 mr-1" />
                Best Value
              </Badge>
            </div>
            <CardHeader className="text-center pb-4 pt-6">
              <div className="flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6 text-purple-600 mr-2" />
                <CardTitle className="text-xl">Pro</CardTitle>
              </div>
              <div className="text-3xl font-bold text-purple-900">
                $29
                <span className="text-lg font-normal text-purple-600">/month</span>
              </div>
              <p className="text-purple-600">Advanced AI optimization</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {features.pro.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-gray-900">{feature.name}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4">
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  onClick={() => currentTier === 'pro' ? undefined : onUpgrade()}
                  disabled={currentTier === 'pro'}
                >
                  {currentTier === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Why upgrade to Pro?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">AI-Powered Optimization</h4>
                <p className="text-gray-600">Get personalized system recommendations that maximize your savings and ROI</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Real-Time Analysis</h4>
                <p className="text-gray-600">Instant system compatibility checks and performance predictions</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Crown className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Priority Support</h4>
                <p className="text-gray-600">Get expert help when you need it with live chat and priority response</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingTiers;