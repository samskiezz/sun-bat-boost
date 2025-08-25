-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule weekly CEC data updates (every Sunday at 2 AM)
SELECT cron.schedule(
  'weekly-cec-data-update',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$
  SELECT
    net.http_post(
        url:='https://mkgcacuhdwpsfkbguddk.supabase.co/functions/v1/update-cec-data',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rZ2NhY3VoZHdwc2ZrYmd1ZGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjIwNzcsImV4cCI6MjA3MTY5ODA3N30.rtp0L8COz3XcmEzGqElLs-d08qHnZDbPr0ZWmyqq8Ms"}'::jsonb,
        body:='{"refresh_type": "all"}'::jsonb
    ) as request_id;
  $$
);

-- Insert initial battery-VPP compatibility data
INSERT INTO public.battery_vpp_compatibility (battery_id, vpp_provider_id, compatibility_score, notes)
SELECT 
  b.id as battery_id,
  v.id as vpp_provider_id,
  CASE 
    WHEN b.brand = ANY(v.compatible_battery_brands) THEN 100
    WHEN b.capacity_kwh >= v.min_battery_kwh AND (v.max_battery_kwh IS NULL OR b.capacity_kwh <= v.max_battery_kwh) THEN 80
    ELSE 60
  END as compatibility_score,
  CASE 
    WHEN b.brand = ANY(v.compatible_battery_brands) THEN 'Fully compatible - recommended by VPP provider'
    WHEN b.capacity_kwh >= v.min_battery_kwh AND (v.max_battery_kwh IS NULL OR b.capacity_kwh <= v.max_battery_kwh) THEN 'Compatible - meets capacity requirements'
    ELSE 'May require additional setup or verification'
  END as notes
FROM public.cec_batteries b
CROSS JOIN public.vpp_providers v
WHERE b.is_active = true AND v.is_active = true
ON CONFLICT (battery_id, vpp_provider_id) DO UPDATE SET
  compatibility_score = EXCLUDED.compatibility_score,
  notes = EXCLUDED.notes,
  verified_date = CURRENT_DATE;