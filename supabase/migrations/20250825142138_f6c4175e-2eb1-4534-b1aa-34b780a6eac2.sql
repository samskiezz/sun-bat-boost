-- Fix the security definer issue by recreating the view without security definer
DROP VIEW IF EXISTS public.all_products;

CREATE OR REPLACE VIEW public.all_products 
WITH (security_invoker=true) AS
SELECT 
  'panel' as product_type,
  id,
  brand,
  model,
  technology as specs,
  power_rating as rating,
  NULL as capacity,
  false as vpp_capable,
  certificate,
  approval_status,
  approval_expires,
  image_url,
  description,
  source_url,
  scraped_at
FROM public.pv_modules
UNION ALL
SELECT 
  'battery' as product_type,
  id,
  brand,
  model,
  chemistry as specs,
  NULL as rating,
  capacity_kwh as capacity,
  vpp_capable,
  certificate,
  approval_status,
  approval_expires,
  image_url,
  description,
  source_url,
  scraped_at
FROM public.batteries;