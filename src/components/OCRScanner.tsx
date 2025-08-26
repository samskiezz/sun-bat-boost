import SmartOCRScanner from './SmartOCRScanner';
import { OCRResult } from '@/utils/masterOCRPipeline';

interface OCRScannerProps {
  onDataExtracted: (data: OCRResult) => void;
}

export default function OCRScanner({ onDataExtracted }: OCRScannerProps) {
  return <SmartOCRScanner onDataExtracted={onDataExtracted} />;
}