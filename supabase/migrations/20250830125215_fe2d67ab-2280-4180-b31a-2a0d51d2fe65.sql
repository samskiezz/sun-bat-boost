
-- Geospatial + ML Enhancement Pack schema
-- 1) Embeddings store (generic across kinds)
create table if not exists public.ml_vectors (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  dim integer not null,
  embedding_format text not null default 'f32', -- e.g. f32, f16, int8
  embedding bytea not null,                    -- raw bytes; flexible across models
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ml_vectors_kind_created_idx on public.ml_vectors(kind, created_at desc);
create index if not exists ml_vectors_kind_dim_idx on public.ml_vectors(kind, dim);

alter table public.ml_vectors enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ml_vectors'
  ) then
    create policy "Allow all operations on ml_vectors"
      on public.ml_vectors for all using (true) with check (true);
  end if;
end $$;

-- 2) Match results history (for debugging/audit)
create table if not exists public.ml_matches (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null,
  target_id uuid not null,
  score double precision not null,
  kind text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ml_matches_source_idx on public.ml_matches(source_id, score desc);
create index if not exists ml_matches_kind_idx on public.ml_matches(kind, created_at desc);

alter table public.ml_matches enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ml_matches'
  ) then
    create policy "Allow all operations on ml_matches"
      on public.ml_matches for all using (true) with check (true);
  end if;
end $$;

-- 3) Polygon-derived features and stable signature per site
create table if not exists public.poly_features (
  site_id uuid primary key,
  features jsonb not null default '{}'::jsonb,
  signature text unique not null,
  updated_at timestamptz not null default now()
);

-- Reuse existing trigger function to maintain updated_at
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_poly_features'
  ) then
    create trigger set_updated_at_poly_features
      before update on public.poly_features
      for each row execute function public.update_updated_at_column();
  end if;
end $$;

alter table public.poly_features enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'poly_features'
  ) then
    create policy "Allow all operations on poly_features"
      on public.poly_features for all using (true) with check (true);
  end if;
end $$;

-- 4) Computer vision roof segmentation cache
create table if not exists public.cv_roof_segments (
  site_id uuid primary key,
  mask_ref text not null,          -- storage path or external ref
  meta jsonb not null default '{}'::jsonb
);

alter table public.cv_roof_segments enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cv_roof_segments'
  ) then
    create policy "Allow all operations on cv_roof_segments"
      on public.cv_roof_segments for all using (true) with check (true);
  end if;
end $$;

-- 5) Training datasets registry
create table if not exists public.training_datasets (
  name text primary key,
  spec jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.training_datasets enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'training_datasets'
  ) then
    create policy "Allow all operations on training_datasets"
      on public.training_datasets for all using (true) with check (true);
  end if;
end $$;

-- 6) Lightweight model registry
create table if not exists public.model_registry (
  name text not null,
  ver text not null,
  metrics jsonb not null default '{}'::jsonb,
  uri text not null,
  created_at timestamptz not null default now(),
  primary key (name, ver)
);

alter table public.model_registry enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'model_registry'
  ) then
    create policy "Allow all operations on model_registry"
      on public.model_registry for all using (true) with check (true);
  end if;
end $$;

-- 7) Satellite tile cache (logical cache index; blob lives in storage)
create table if not exists public.tile_cache (
  key text primary key,           -- bbox|z or content hash
  blob_ref text not null,         -- storage ref (e.g., 'gis/tiles/...')
  ttl timestamptz not null
);

create index if not exists tile_cache_ttl_idx on public.tile_cache(ttl);

alter table public.tile_cache enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tile_cache'
  ) then
    create policy "Allow all operations on tile_cache"
      on public.tile_cache for all using (true) with check (true);
  end if;
end $$;
