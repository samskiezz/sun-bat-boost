import SmartOCRScanner from './SmartOCRScanner';
import { ExtractResult } from '@/ocr/extract.types';

interface OCRScannerProps {
  onDataExtracted: (data: ExtractResult) => void;
}

export default function OCRScanner({ onDataExtracted }: OCRScannerProps) {
  return <SmartOCRScanner onDataExtracted={onDataExtracted} />;
}