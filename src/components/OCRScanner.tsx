import SmartOCRScanner from './SmartOCRScanner';
import { OCRResult } from '@/utils/ocrPipeline_noInverterDB';

interface OCRScannerProps {
  onDataExtracted: (data: OCRResult) => void;
}

export default function OCRScanner({ onDataExtracted }: OCRScannerProps) {
  return <SmartOCRScanner onDataExtracted={onDataExtracted} />;
}