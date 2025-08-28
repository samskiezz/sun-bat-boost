import SmartOCRScanner from './SmartOCRScanner';
import { ExtractResult } from '@/ocr/extract.types';
import { useState } from 'react';

interface OCRScannerProps {
  onDataExtracted: (data: any) => void;
  onAddressExtracted?: (address: string, postcode?: string) => void;
}

export default function OCRScanner({ onDataExtracted, onAddressExtracted }: OCRScannerProps) {
  const [processing, setProcessing] = useState(false);

  const handleExtraction = (billData: any) => {
    // Extract address if available and call onAddressExtracted
    if (billData.address && onAddressExtracted) {
      onAddressExtracted(billData.address, billData.postcode);
    }

    // Pass the bill data directly to the handler
    onDataExtracted(billData);
  };

  return (
    <SmartOCRScanner 
      onExtraction={handleExtraction}
      onProcessing={setProcessing}
    />
  );
}