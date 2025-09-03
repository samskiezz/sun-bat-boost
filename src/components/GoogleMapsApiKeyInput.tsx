import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GoogleMapsApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
  className?: string;
}

export function GoogleMapsApiKeyInput({ onApiKeySubmit, className = "" }: GoogleMapsApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = () => {
    if (apiKey.trim()) {
      // Store in localStorage for persistence
      localStorage.setItem('google_maps_api_key', apiKey.trim());
      onApiKeySubmit(apiKey.trim());
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🗺️ Google Maps API Key Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          To use high-quality satellite imagery and mapping features, please enter your Google Maps API key.
          <br />
          <a 
            href="https://developers.google.com/maps/documentation/javascript/get-api-key" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Get your API key here →
          </a>
        </div>
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Enter your Google Maps API key..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono text-xs"
          />
          <Button 
            onClick={handleSubmit} 
            disabled={!apiKey.trim()} 
            className="w-full"
          >
            Load Google Maps
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          <strong>Note:</strong> Your API key is stored locally in your browser and never sent to our servers.
        </div>
      </CardContent>
    </Card>
  );
}