import { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface UseGoogleMapsLoaderOptions {
  apiKey: string;
  libraries?: string[];
}

export const useGoogleMapsLoader = ({ apiKey, libraries = ['places', 'geometry'] }: UseGoogleMapsLoaderOptions) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setLoadError('Google Maps API key is required');
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: libraries as any[]
    });

    loader.load()
      .then(() => {
        setIsLoaded(true);
        setLoadError(null);
      })
      .catch((error) => {
        console.error('Failed to load Google Maps:', error);
        setLoadError('Failed to load Google Maps API');
      });
  }, [apiKey, libraries]);

  return { isLoaded, loadError };
};