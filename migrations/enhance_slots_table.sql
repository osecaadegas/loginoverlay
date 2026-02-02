-- Enhanced slots table migration
-- Adds: rtp, volatility, reels, max_win, status, tags, audit fields

-- Add new columns to existing slots table
ALTER TABLE public.slots 
ADD COLUMN IF NOT EXISTS rtp DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS volatility TEXT CHECK (volatility IN ('low', 'medium', 'high', 'very_high')),
ADD COLUMN IF NOT EXISTS reels TEXT,
ADD COLUMN IF NOT EXISTS max_win_multiplier DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS min_bet DECIMAL(10,2) DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS max_bet DECIMAL(10,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'live' CHECK (status IN ('live', 'draft', 'disabled')),
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_slots_status ON public.slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_rtp ON public.slots(rtp);
CREATE INDEX IF NOT EXISTS idx_slots_volatility ON public.slots(volatility);
CREATE INDEX IF NOT EXISTS idx_slots_tags ON public.slots USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_slots_features ON public.slots USING GIN(features);
CREATE INDEX IF NOT EXISTS idx_slots_is_featured ON public.slots(is_featured) WHERE is_featured = true;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_slots_search ON public.slots USING GIN(to_tsvector('english', name || ' ' || provider));

-- Create audit log table
CREATE TABLE IF NOT EXISTS public.slot_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
  slot_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'bulk_update')),
  changes JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_slot_id ON public.slot_audit_log(slot_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON public.slot_audit_log(performed_at DESC);

-- Enable RLS on audit log
ALTER TABLE public.slot_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read audit for authenticated" ON public.slot_audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert audit for authenticated" ON public.slot_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS slots_updated_at ON public.slots;
CREATE TRIGGER slots_updated_at
  BEFORE UPDATE ON public.slots
  FOR EACH ROW
  EXECUTE FUNCTION update_slots_updated_at();

-- Function for paginated slot search with filters
CREATE OR REPLACE FUNCTION search_slots(
  p_search TEXT DEFAULT NULL,
  p_providers TEXT[] DEFAULT NULL,
  p_status TEXT[] DEFAULT NULL,
  p_volatility TEXT[] DEFAULT NULL,
  p_rtp_min DECIMAL DEFAULT NULL,
  p_rtp_max DECIMAL DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50,
  p_sort_by TEXT DEFAULT 'name',
  p_sort_dir TEXT DEFAULT 'asc'
)
RETURNS TABLE (
  slots JSONB,
  total_count BIGINT,
  page INTEGER,
  page_size INTEGER,
  total_pages INTEGER
) AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_slots JSONB;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM public.slots s
  WHERE 
    (p_search IS NULL OR s.name ILIKE '%' || p_search || '%' OR s.provider ILIKE '%' || p_search || '%')
    AND (p_providers IS NULL OR s.provider = ANY(p_providers))
    AND (p_status IS NULL OR s.status = ANY(p_status))
    AND (p_volatility IS NULL OR s.volatility = ANY(p_volatility))
    AND (p_rtp_min IS NULL OR s.rtp >= p_rtp_min)
    AND (p_rtp_max IS NULL OR s.rtp <= p_rtp_max)
    AND (p_tags IS NULL OR s.tags && p_tags);
  
  -- Get paginated results
  SELECT jsonb_agg(row_to_json(t)) INTO v_slots
  FROM (
    SELECT s.*
    FROM public.slots s
    WHERE 
      (p_search IS NULL OR s.name ILIKE '%' || p_search || '%' OR s.provider ILIKE '%' || p_search || '%')
      AND (p_providers IS NULL OR s.provider = ANY(p_providers))
      AND (p_status IS NULL OR s.status = ANY(p_status))
      AND (p_volatility IS NULL OR s.volatility = ANY(p_volatility))
      AND (p_rtp_min IS NULL OR s.rtp >= p_rtp_min)
      AND (p_rtp_max IS NULL OR s.rtp <= p_rtp_max)
      AND (p_tags IS NULL OR s.tags && p_tags)
    ORDER BY
      CASE WHEN p_sort_by = 'name' AND p_sort_dir = 'asc' THEN s.name END ASC,
      CASE WHEN p_sort_by = 'name' AND p_sort_dir = 'desc' THEN s.name END DESC,
      CASE WHEN p_sort_by = 'provider' AND p_sort_dir = 'asc' THEN s.provider END ASC,
      CASE WHEN p_sort_by = 'provider' AND p_sort_dir = 'desc' THEN s.provider END DESC,
      CASE WHEN p_sort_by = 'rtp' AND p_sort_dir = 'asc' THEN s.rtp END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'rtp' AND p_sort_dir = 'desc' THEN s.rtp END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'asc' THEN s.created_at END ASC,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'desc' THEN s.created_at END DESC,
      s.name ASC
    LIMIT p_page_size
    OFFSET v_offset
  ) t;
  
  RETURN QUERY SELECT 
    COALESCE(v_slots, '[]'::jsonb),
    v_total,
    p_page,
    p_page_size,
    CEIL(v_total::DECIMAL / p_page_size)::INTEGER;
END;
$$ LANGUAGE plpgsql;
