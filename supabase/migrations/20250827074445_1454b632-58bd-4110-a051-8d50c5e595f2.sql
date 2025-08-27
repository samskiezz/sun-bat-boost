-- Create storage bucket for GIS files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gis', 'gis', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for GIS bucket
CREATE POLICY "Allow public read access to GIS files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gis');

CREATE POLICY "Allow service role to manage GIS files" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'gis');

-- Create the new dnsps_static table for postcode-level mapping
CREATE TABLE IF NOT EXISTS dnsps_static (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,
  postcode INTEGER NOT NULL,
  dnsp_code TEXT NOT NULL,
  dnsp_name TEXT NOT NULL,
  overlap_pct NUMERIC NOT NULL,
  export_cap_kw NUMERIC DEFAULT 5.0,
  supports_flexible_export BOOLEAN DEFAULT false,
  phase_limit TEXT DEFAULT '1P<=5kW;3P<=10kW',
  notes TEXT,
  version TEXT NOT NULL DEFAULT 'v1',
  source TEXT NOT NULL DEFAULT 'builder',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_dnsps_static_version_po ON dnsps_static(version, postcode);
CREATE INDEX IF NOT EXISTS idx_dnsps_static_po ON dnsps_static(postcode);

-- Enable RLS
ALTER TABLE dnsps_static ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public read access for dnsps_static" 
ON dnsps_static 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage dnsps_static" 
ON dnsps_static 
FOR ALL 
USING (true);