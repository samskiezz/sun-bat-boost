import UniversalOCRScanner from './UniversalOCRScanner';
import { OCRResult } from '@/utils/ocrPipeline_noInverterDB';

interface SmartOCRScannerProps {
  onDataExtracted: (data: OCRResult) => void;
}

const SmartOCRScanner: React.FC<SmartOCRScannerProps> = ({ onDataExtracted }) => {
  return <UniversalOCRScanner onDataExtracted={onDataExtracted} />;
};

export default SmartOCRScanner;