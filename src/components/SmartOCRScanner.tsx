import UniversalOCRScanner from './UniversalOCRScanner';
import { ExtractResult } from '@/ocr/extract.types';

interface SmartOCRScannerProps {
  onDataExtracted: (data: ExtractResult) => void;
}

const SmartOCRScanner: React.FC<SmartOCRScannerProps> = ({ onDataExtracted }) => {
  return <UniversalOCRScanner onDataExtracted={onDataExtracted} />;
};

export default SmartOCRScanner;