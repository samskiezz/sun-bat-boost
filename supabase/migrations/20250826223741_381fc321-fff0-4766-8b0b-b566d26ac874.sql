-- Create storage bucket for PDF proposals
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-proposals', 'pdf-proposals', false);

-- Create storage policies for PDF proposals
CREATE POLICY "Users can upload PDF proposals" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'pdf-proposals');

CREATE POLICY "Users can view PDF proposals" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'pdf-proposals');

CREATE POLICY "Users can update PDF proposals" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'pdf-proposals');

CREATE POLICY "Users can delete PDF proposals" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'pdf-proposals');

-- Enable realtime for proposal guidelines
ALTER TABLE public.proposal_guidelines REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_guidelines;

-- Enable realtime for training metrics
ALTER TABLE public.training_metrics REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_metrics;