import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, FolderOpen, Zap, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UploadedGuideline {
  id: string;
  source: string;
  extracted_at: string;
  guidelines: any;
}

interface ProcessingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  uploadedPath?: string;
}

const PDFProposalUploader: React.FC = () => {
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  const [guidelines, setGuidelines] = useState<UploadedGuideline[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Load saved processing files from localStorage on mount
  useEffect(() => {
    const savedFiles = localStorage.getItem('pdf-processing-queue');
    if (savedFiles) {
      try {
        const parsedFiles = JSON.parse(savedFiles);
        // Only restore files that were in error state or completed
        const restorableFiles = parsedFiles.filter((f: ProcessingFile) => 
          f.status === 'completed' || f.status === 'error'
        );
        setProcessingFiles(restorableFiles);
      } catch (error) {
        console.error('Failed to restore processing files:', error);
        localStorage.removeItem('pdf-processing-queue');
      }
    }
  }, []);

  // Save processing files to localStorage whenever it changes
  useEffect(() => {
    if (processingFiles.length > 0) {
      localStorage.setItem('pdf-processing-queue', JSON.stringify(processingFiles));
    } else {
      localStorage.removeItem('pdf-processing-queue');
    }
  }, [processingFiles]);

  // Real-time updates for guidelines
  useEffect(() => {
    loadGuidelines();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('proposal-guidelines-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proposal_guidelines'
        },
        () => {
          loadGuidelines();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadGuidelines = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pdf-proposal-processor', {
        body: { action: 'get_guidelines' }
      });

      if (error) throw error;
      setGuidelines(data.guidelines || []);
    } catch (error) {
      console.error('Failed to load guidelines:', error);
    }
  };

  const validateFiles = (files: FileList | File[]): File[] => {
    const validFiles: File[] = [];
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a PDF file`,
          variant: "destructive"
        });
        continue;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "File too large",
          description: `${file.name} exceeds 50MB limit`,
          variant: "destructive"
        });
        continue;
      }
      
      validFiles.push(file);
    }
    
    return validFiles;
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    
    // Initialize processing files state
    const initialProcessingFiles: ProcessingFile[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));
    
    setProcessingFiles(prev => [...prev, ...initialProcessingFiles]);
    
    // Process files in smaller batches with aggressive throttling
    const batchSize = 2; // Further reduced for maximum stability
    const batches = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    
    let completedCount = 0;
    let errorCount = 0;
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} files`);
      
      // Process files sequentially within batch for maximum stability
      for (const file of batch) {
        const fileIndex = files.indexOf(file);
        const globalIndex = processingFiles.length - files.length + fileIndex;
        
        try {
          await processFile(file, globalIndex);
          completedCount++;
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          errorCount++;
          setProcessingFiles(prev => prev.map((f, i) => 
            i === globalIndex ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Processing failed'
            } : f
          ));
        }
        
        // Add delay between files
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Longer delay between batches
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Update progress
      toast({
        title: `Batch ${batchIndex + 1} Complete`,
        description: `Processed: ${completedCount + errorCount}/${files.length} (${errorCount} failed)`,
      });
    }
    
    setIsProcessing(false);
    
    toast({
      title: "Bulk Processing Complete",
      description: `${completedCount} successful, ${errorCount} failed of ${files.length} files`,
      variant: errorCount > completedCount ? "destructive" : "default"
    });
  };

  const processFile = async (file: File, index: number) => {
    try {
      // Update status to uploading
      setProcessingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'uploading', progress: 10 } : f
      ));

      // Upload to storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdf-proposals')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update progress
      setProcessingFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'processing', 
          progress: 40,
          uploadedPath: uploadData.path
        } : f
      ));

      // Get signed URL for processing
      const { data: urlData } = await supabase.storage
        .from('pdf-proposals')
        .createSignedUrl(uploadData.path, 3600);

      if (!urlData?.signedUrl) {
        throw new Error('Failed to get signed URL');
      }

      // Process with edge function
      const { data, error } = await supabase.functions.invoke('pdf-proposal-processor', {
        body: {
          action: 'process_pdf_from_storage',
          filePath: uploadData.path,
          fileName: file.name,
          signedUrl: urlData.signedUrl
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Processing failed');
      }

      // Update to completed
      setProcessingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'completed', progress: 100 } : f
      ));

    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      
      setProcessingFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Processing failed'
        } : f
      ));
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        processFiles(validFiles);
      }
    }
    // Reset input
    event.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        processFiles(validFiles);
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const removeFile = (index: number) => {
    setProcessingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearCompletedFiles = () => {
    setProcessingFiles(prev => prev.filter(f => f.status !== 'completed'));
    toast({
      title: "Queue Cleared",
      description: "Removed all completed files from queue",
    });
  };

  const retryFailedFiles = async () => {
    const failedFiles = processingFiles
      .filter(f => f.status === 'error')
      .map(f => f.file);
    
    if (failedFiles.length === 0) {
      toast({
        title: "No Failed Files",
        description: "There are no failed files to retry",
      });
      return;
    }

    // Remove failed files from queue and reprocess
    setProcessingFiles(prev => prev.filter(f => f.status !== 'error'));
    await processFiles(failedFiles);
  };

  const updateTrainingStandards = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('pdf-proposal-processor', {
        body: { action: 'update_training_standards' }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update training standards');
      }

      toast({
        title: "Training Standards Updated",
        description: "AI training system now uses your proposal guidelines",
      });
    } catch (error) {
      console.error('Training standards update error:', error);
      toast({
        title: "Update Failed", 
        description: error instanceof Error ? error.message : "Failed to update training standards",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: ProcessingFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
      case 'uploading':
        return <Zap className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bulk PDF Proposal Uploader
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload multiple solar proposal PDFs at once (up to 50+). Drag and drop or click to select files.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Bulk Upload Zone */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : isProcessing 
                ? 'border-gray-300 bg-gray-50' 
                : 'border-muted hover:border-primary/50 hover:bg-muted/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isProcessing ? (
            <div className="space-y-4">
              <Zap className="h-12 w-12 mx-auto text-blue-500 animate-pulse" />
              <div>
                <p className="font-medium">Processing {processingFiles.length} PDF proposals...</p>
                <p className="text-sm text-muted-foreground">
                  Completed: {processingFiles.filter(f => f.status === 'completed').length} | 
                  Failed: {processingFiles.filter(f => f.status === 'error').length}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="flex items-center gap-4">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <FolderOpen className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Drop PDF proposals here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Select multiple files to upload in bulk. Supports up to 50MB per file.
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  id="bulk-pdf-upload"
                />
                <Button asChild variant="outline" size="lg">
                  <label htmlFor="bulk-pdf-upload" className="cursor-pointer">
                    <Upload className="h-5 w-5 mr-2" />
                    Select Multiple PDFs
                  </label>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Processing Files List */}
        {processingFiles.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Processing Queue ({processingFiles.length} files)</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={retryFailedFiles}
                    disabled={isProcessing || !processingFiles.some(f => f.status === 'error')}
                    className="text-xs"
                  >
                    Retry Failed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearCompletedFiles}
                    disabled={isProcessing || !processingFiles.some(f => f.status === 'completed')}
                    className="text-xs"
                  >
                    Clear Completed
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Completed: {processingFiles.filter(f => f.status === 'completed').length} | 
                Failed: {processingFiles.filter(f => f.status === 'error').length} | 
                Processing: {processingFiles.filter(f => f.status === 'uploading' || f.status === 'processing').length}
              </div>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto space-y-2">
              {processingFiles.map((fileInfo, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getStatusIcon(fileInfo.status)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{fileInfo.file.name}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={fileInfo.progress} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground min-w-fit">
                        {fileInfo.progress}%
                      </span>
                    </div>
                    {fileInfo.status === 'error' && fileInfo.error && (
                      <p className="text-xs text-red-500 mt-1">{fileInfo.error}</p>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    disabled={fileInfo.status === 'uploading' || fileInfo.status === 'processing'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Guidelines Summary */}
        {guidelines.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Extracted Guidelines ({guidelines.length} proposals processed)
              </h3>
              <Button 
                onClick={updateTrainingStandards}
                disabled={isProcessing}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply to Training System
              </Button>
            </div>
            
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {guidelines.map((guideline) => (
                <div key={guideline.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <FileText className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{guideline.source}</p>
                    <p className="text-xs text-muted-foreground">
                      Extracted {new Date(guideline.extracted_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900">Bulk Upload Benefits:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Process 50+ proposals simultaneously with parallel upload</li>
                <li>Automatic text extraction and guideline synthesis</li>
                <li>Real-time progress tracking for each file</li>
                <li>Integrates directly with multi-task AI training system</li>
                <li>Builds comprehensive training dataset from your real proposals</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFProposalUploader;