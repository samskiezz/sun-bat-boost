import SmartOCRScanner from './SmartOCRScanner';
import { AdvancedProcessorResult } from '@/utils/advancedDocumentProcessor';

interface OCRScannerProps {
  onDataExtracted: (data: AdvancedProcessorResult['extractedData']) => void;
}

export default function OCRScanner({ onDataExtracted }: OCRScannerProps) {
  return <SmartOCRScanner onDataExtracted={onDataExtracted} />;
}