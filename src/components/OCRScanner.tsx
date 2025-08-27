import SmartOCRScanner from './SmartOCRScanner';
import { ExtractResult } from '@/ocr/extract.types';
import { useState } from 'react';

interface OCRScannerProps {
  onDataExtracted: (data: ExtractResult) => void;
  onAddressExtracted?: (address: string, postcode?: string) => void;
}

export default function OCRScanner({ onDataExtracted, onAddressExtracted }: OCRScannerProps) {
  const [processing, setProcessing] = useState(false);

  const handleExtraction = (billData: any) => {
    // Extract address if available and call onAddressExtracted
    if (billData.address && onAddressExtracted) {
      onAddressExtracted(billData.address, billData.postcode);
    }

    // Convert SmartOCRScanner data to ExtractResult format
    const extractResult: ExtractResult = {
      panels: {
        candidates: [],
        confidence: 'LOW' as const,
        warnings: []
      },
      battery: {
        candidates: [],
        confidence: 'LOW' as const,
        warnings: []
      },
      inverter: {
        confidence: 'LOW' as const,
        warnings: []
      },
      policyCalcInput: {},
      errors: []
    };
    onDataExtracted(extractResult);
  };

  return (
    <SmartOCRScanner 
      onExtraction={handleExtraction}
      onProcessing={setProcessing}
    />
  );
}