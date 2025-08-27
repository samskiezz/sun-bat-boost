import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network, Upload, Database, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { clearDnspCache } from '@/utils/dnspResolver';

interface DnspPanelProps {
  className?: string;
}

export const DnspPanel: React.FC<DnspPanelProps> = ({ className = '' }) => {
  const [csvData, setCsvData] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [dnspCount, setDnspCount] = useState<number>(0);
  const { toast } = useToast();

  // Load current DNSP count
  const loadDnspCount = async () => {
    try {
      const { count } = await supabase
        .from('dnsps')
        .select('*', { count: 'exact', head: true });
      setDnspCount(count || 0);
    } catch (error) {
      console.error('Error loading DNSP count:', error);
    }
  };

  // Seed default DNSP data
  const handleSeedDefaults = async () => {
    setLoading(true);
    setStatus('Seeding default DNSP data...');
    
    try {
      const response = await supabase.functions.invoke('dnsps-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      if (result.success) {
        clearDnspCache(); // Clear cache after update
        await loadDnspCount();
        setStatus(result.message);
        toast({
          title: "Success",
          description: `Seeded ${result.seeded} default DNSP records`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Seed error:', error);
      setStatus(`Seed failed: ${error.message}`);
      toast({
        title: "Seed Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload CSV data
  const handleCsvUpload = async () => {
    if (!csvData.trim()) {
      toast({
        title: "No Data",
        description: "Please enter CSV data to upload",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setStatus('Uploading CSV data...');
    
    try {
      const response = await supabase.functions.invoke('dnsps-import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csvData
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      if (result.success) {
        clearDnspCache(); // Clear cache after update
        await loadDnspCount();
        setStatus(result.message);
        setCsvData(''); // Clear the textarea
        toast({
          title: "Success",
          description: `Imported ${result.imported} DNSP records from CSV`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('CSV upload error:', error);
      setStatus(`Upload failed: ${error.message}`);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load count on component mount
  React.useEffect(() => {
    loadDnspCount();
  }, []);

  return (
    <Card className={`bg-white/10 border-white/20 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          DNSP Database Management
          <Badge variant="secondary" className="ml-auto">
            {dnspCount} records
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSeedDefaults}
            disabled={loading}
            variant="outline"
            className="bg-white/5 border-white/20"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Database className="w-4 h-4 mr-2" />
            )}
            Seed Defaults
          </Button>
          
          <Button
            onClick={handleCsvUpload}
            disabled={loading || !csvData.trim()}
            className="bg-gradient-primary text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload CSV
          </Button>
          
          <Button
            onClick={loadDnspCount}
            variant="ghost"
            size="sm"
            className="ml-auto"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* CSV Input */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            CSV Data (state, postcode_start, postcode_end, network, export_cap_kw)
          </label>
          <Textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="state,postcode_start,postcode_end,network,export_cap_kw&#10;NSW,2000,2249,Ausgrid,5.0&#10;VIC,3000,3199,CitiPower,5.0"
            rows={6}
            className="bg-white/5 border-white/20 font-mono text-sm"
          />
        </div>

        {/* Status */}
        {status && (
          <div className={`text-sm p-3 rounded-lg ${
            status.includes('failed') || status.includes('error')
              ? 'bg-red-500/20 text-red-100'
              : 'bg-green-500/20 text-green-100'
          }`}>
            {status}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Seed Defaults:</strong> Loads Australia-wide DNSP mappings with major networks</p>
          <p><strong>CSV Format:</strong> state,postcode_start,postcode_end,network,export_cap_kw</p>
          <p><strong>Example:</strong> NSW,2000,2249,Ausgrid,5.0</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DnspPanel;