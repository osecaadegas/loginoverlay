BEGIN;

ALTER TABLE public.slot_providers ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.slot_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
  slot_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'bulk_update')),
  changes JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_slot_id ON public.slot_audit_log(slot_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON public.slot_audit_log(performed_at DESC);
ALTER TABLE public.slot_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read audit for authenticated" ON public.slot_audit_log;
DROP POLICY IF EXISTS "Allow insert audit for authenticated" ON public.slot_audit_log;
DROP POLICY IF EXISTS "Slot moderators read audit" ON public.slot_audit_log;
DROP POLICY IF EXISTS "Slot moderators write audit" ON public.slot_audit_log;
CREATE POLICY "Slot moderators read audit" ON public.slot_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = (SELECT auth.uid())
    AND r.role IN ('admin', 'superadmin', 'slot_modder') AND r.is_active = true
    AND (r.access_expires_at IS NULL OR r.access_expires_at > now())));
CREATE POLICY "Slot moderators write audit" ON public.slot_audit_log FOR INSERT TO authenticated
  WITH CHECK (performed_by = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = (SELECT auth.uid())
    AND r.role IN ('admin', 'superadmin', 'slot_modder') AND r.is_active = true
    AND (r.access_expires_at IS NULL OR r.access_expires_at > now())));
REVOKE ALL ON public.slot_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.slot_audit_log TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.slot_provider_name_key(value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
SET search_path = '' AS $$
  SELECT lower(regexp_replace(btrim(value), '\s+', ' ', 'g'));
$$;

DROP POLICY IF EXISTS "Admins can manage providers" ON public.slot_providers;
CREATE POLICY "Admins can manage providers" ON public.slot_providers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = (SELECT auth.uid())
    AND r.role IN ('admin', 'superadmin', 'slot_modder') AND r.is_active = true
    AND (r.access_expires_at IS NULL OR r.access_expires_at > now())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = (SELECT auth.uid())
    AND r.role IN ('admin', 'superadmin', 'slot_modder') AND r.is_active = true
    AND (r.access_expires_at IS NULL OR r.access_expires_at > now())));

DROP POLICY IF EXISTS "Allow slot management for admins and slot_modders" ON public.slots;
CREATE POLICY "Allow slot management for admins and slot_modders" ON public.slots
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = (SELECT auth.uid())
    AND r.role IN ('admin', 'superadmin', 'slot_modder') AND r.is_active = true
    AND (r.access_expires_at IS NULL OR r.access_expires_at > now())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = (SELECT auth.uid())
    AND r.role IN ('admin', 'superadmin', 'slot_modder') AND r.is_active = true
    AND (r.access_expires_at IS NULL OR r.access_expires_at > now())));

GRANT SELECT ON public.slot_providers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.slot_providers TO authenticated;

CREATE OR REPLACE FUNCTION public.get_slot_provider_counts()
RETURNS TABLE(provider TEXT, slot_count BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT s.provider, count(*) FROM public.slots s GROUP BY s.provider ORDER BY s.provider;
$$;

CREATE OR REPLACE FUNCTION public.lock_slot_provider_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  -- Take the catalog lock before row locks, matching the provider mutation RPCs.
  PERFORM pg_catalog.pg_advisory_xact_lock(730421, 1);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS lock_slot_provider_assignment ON public.slots;
CREATE TRIGGER lock_slot_provider_assignment BEFORE INSERT OR UPDATE OF provider ON public.slots
  FOR EACH STATEMENT EXECUTE FUNCTION public.lock_slot_provider_assignment();

CREATE OR REPLACE FUNCTION public.guard_removed_slot_provider()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_active BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.provider IS NOT DISTINCT FROM OLD.provider THEN RETURN NEW; END IF;
  SELECT p.is_active IS DISTINCT FROM false INTO v_active FROM public.slot_providers p
    WHERE public.slot_provider_name_key(NEW.provider) IN
      (SELECT public.slot_provider_name_key(a) FROM unnest(p.aliases || ARRAY[p.name]) a)
    ORDER BY (p.is_active IS DISTINCT FROM false) DESC, (p.name = NEW.provider) DESC, p.id LIMIT 1;
  IF FOUND AND NOT v_active THEN RAISE EXCEPTION 'Provider has been removed. Choose an active provider'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_removed_slot_provider ON public.slots;
CREATE TRIGGER guard_removed_slot_provider BEFORE INSERT OR UPDATE OF provider ON public.slots
  FOR EACH ROW EXECUTE FUNCTION public.guard_removed_slot_provider();

CREATE OR REPLACE FUNCTION public.save_slot_provider(
  p_name TEXT,
  p_provider_id UUID DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_website_url TEXT DEFAULT NULL,
  p_aliases TEXT[] DEFAULT '{}'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_old public.slot_providers%ROWTYPE;
  v_provider public.slot_providers%ROWTYPE;
  v_name TEXT := regexp_replace(btrim(p_name), '\s+', ' ', 'g');
  v_aliases TEXT[];
  v_keys TEXT[];
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role IN ('admin', 'superadmin', 'slot_modder')
      AND r.is_active = true AND (r.access_expires_at IS NULL OR r.access_expires_at > now())) THEN
    RAISE EXCEPTION 'Slot moderator access required' USING ERRCODE = '42501';
  END IF;
  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 120 OR v_name !~ '[a-zA-Z0-9]' THEN
    RAISE EXCEPTION 'Enter a provider name between 1 and 120 characters';
  END IF;
  IF length(coalesce(p_logo_url, '')) > 2048 OR
    (coalesce(p_logo_url, '') <> '' AND p_logo_url !~ '^(https?://[^[:space:]]+|/[^/[:space:]][^[:space:]]*)$') THEN
    RAISE EXCEPTION 'Logo must be an HTTP(S) URL or a local image path';
  END IF;
  IF length(coalesce(p_website_url, '')) > 2048 OR
    (coalesce(p_website_url, '') <> '' AND p_website_url !~ '^https?://[^[:space:]]+$') THEN
    RAISE EXCEPTION 'Website must be an HTTP(S) URL';
  END IF;
  IF coalesce(cardinality(p_aliases), 0) > 200 THEN RAISE EXCEPTION 'Too many provider aliases'; END IF;

  -- Serialize catalog mutations so renames, merges and selected moves cannot race.
  PERFORM pg_catalog.pg_advisory_xact_lock(730421, 1);
  IF p_provider_id IS NOT NULL THEN
    SELECT * INTO v_old FROM public.slot_providers WHERE id = p_provider_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Provider no longer exists. Refresh the catalog'; END IF;
  END IF;
  SELECT coalesce(array_agg(DISTINCT regexp_replace(btrim(a), '\s+', ' ', 'g')), '{}') INTO v_aliases
  FROM unnest(coalesce(v_old.aliases, '{}') || coalesce(p_aliases, '{}') || ARRAY[v_old.name, v_name]) a
  WHERE a IS NOT NULL AND btrim(a) <> '';
  SELECT array_agg(public.slot_provider_name_key(a)) INTO v_keys FROM unnest(v_aliases) a;
  IF EXISTS (SELECT 1 FROM public.slot_providers p
    WHERE p.id IS DISTINCT FROM p_provider_id AND p.is_active IS DISTINCT FROM false
      AND EXISTS (SELECT 1 FROM unnest(p.aliases || ARRAY[p.name]) a
        WHERE public.slot_provider_name_key(a) = ANY(v_keys))) THEN
    RAISE EXCEPTION 'Provider already exists. Use Move slots to combine providers';
  END IF;

  IF p_provider_id IS NULL THEN
    INSERT INTO public.slot_providers(name, slug, logo_url, website_url, aliases, is_active)
      VALUES (v_name, trim(both '-' FROM regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')),
        p_logo_url, p_website_url, v_aliases, true) RETURNING * INTO v_provider;
  ELSE
    UPDATE public.slot_providers SET name = v_name, logo_url = p_logo_url,
      website_url = p_website_url, aliases = v_aliases, is_active = true, updated_at = now()
      WHERE id = p_provider_id RETURNING * INTO v_provider;
  END IF;

  WITH previous AS MATERIALIZED (
    SELECT id, name, provider FROM public.slots
      WHERE public.slot_provider_name_key(provider) = ANY(v_keys) AND provider <> v_name FOR UPDATE
  ), changed AS (
    UPDATE public.slots s SET provider = v_name, updated_by = auth.uid(), updated_at = now()
      FROM previous p WHERE s.id = p.id RETURNING s.id, s.name, p.provider AS old_provider
  )
  INSERT INTO public.slot_audit_log(slot_id, slot_name, action, changes, performed_by)
    SELECT id, name, 'bulk_update', jsonb_build_object('provider', jsonb_build_object('from', old_provider, 'to', v_name)), auth.uid()
    FROM changed;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.slot_providers SET slot_count = (SELECT count(*) FROM public.slots WHERE provider = v_name)
    WHERE id = v_provider.id RETURNING * INTO v_provider;
  INSERT INTO public.slot_audit_log(slot_name, action, changes, performed_by)
    VALUES (v_name, CASE WHEN p_provider_id IS NULL THEN 'create' ELSE 'update' END,
      jsonb_build_object('scope', 'provider', 'before', to_jsonb(v_old), 'after', to_jsonb(v_provider)), auth.uid());
  RETURN jsonb_build_object('provider', to_jsonb(v_provider), 'slots_updated', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.move_slot_provider_slots(
  p_target_provider_id UUID,
  p_provider_id UUID DEFAULT NULL,
  p_slot_ids UUID[] DEFAULT NULL,
  p_remove_source BOOLEAN DEFAULT false,
  p_source_aliases TEXT[] DEFAULT '{}'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_source public.slot_providers%ROWTYPE;
  v_target public.slot_providers%ROWTYPE;
  v_keys TEXT[];
  v_count INTEGER;
  v_expected INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role IN ('admin', 'superadmin', 'slot_modder')
      AND r.is_active = true AND (r.access_expires_at IS NULL OR r.access_expires_at > now())) THEN
    RAISE EXCEPTION 'Slot moderator access required' USING ERRCODE = '42501';
  END IF;
  IF p_target_provider_id IS NULL OR p_target_provider_id = p_provider_id THEN RAISE EXCEPTION 'Choose a different destination provider'; END IF;
  IF p_slot_ids IS NOT NULL AND cardinality(p_slot_ids) = 0 THEN RAISE EXCEPTION 'Select at least one slot'; END IF;
  IF p_slot_ids IS NULL AND p_provider_id IS NULL THEN RAISE EXCEPTION 'Choose a source provider'; END IF;
  IF p_remove_source AND (p_provider_id IS NULL OR p_slot_ids IS NOT NULL) THEN
    RAISE EXCEPTION 'Only a complete provider move can remove its source';
  END IF;
  IF coalesce(cardinality(p_source_aliases), 0) > 200 THEN RAISE EXCEPTION 'Too many provider aliases'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(730421, 1);
  SELECT * INTO v_target FROM public.slot_providers WHERE id = p_target_provider_id AND is_active IS DISTINCT FROM false FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Destination provider is unavailable'; END IF;
  IF p_provider_id IS NOT NULL THEN
    SELECT * INTO v_source FROM public.slot_providers WHERE id = p_provider_id AND is_active IS DISTINCT FROM false FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Source provider is unavailable'; END IF;
    SELECT array_agg(public.slot_provider_name_key(a)) INTO v_keys FROM unnest(v_source.aliases || ARRAY[v_source.name] || coalesce(p_source_aliases, '{}')) a;
    IF EXISTS (SELECT 1 FROM public.slot_providers p WHERE p.id <> p_provider_id AND p.is_active IS DISTINCT FROM false
      AND public.slot_provider_name_key(p.name) = ANY(v_keys)) THEN
      RAISE EXCEPTION 'Source aliases belong to another provider. Refresh the catalog';
    END IF;
    UPDATE public.slot_providers SET aliases = ARRAY(SELECT DISTINCT a FROM
      unnest(v_source.aliases || ARRAY[v_source.name] || coalesce(p_source_aliases, '{}')) a WHERE a IS NOT NULL AND btrim(a) <> '')
      WHERE id = p_provider_id;
  END IF;

  IF p_slot_ids IS NOT NULL THEN
    SELECT count(DISTINCT id) INTO v_expected FROM unnest(p_slot_ids) id;
    PERFORM id FROM public.slots WHERE id = ANY(p_slot_ids) FOR UPDATE;
    IF (SELECT count(*) FROM public.slots WHERE id = ANY(p_slot_ids)
      AND (p_provider_id IS NULL OR public.slot_provider_name_key(provider) = ANY(v_keys))) <> v_expected THEN
      RAISE EXCEPTION 'Selected slots changed or are unavailable. Refresh and select them again';
    END IF;
  END IF;
  WITH previous AS MATERIALIZED (
    SELECT id, name, provider FROM public.slots WHERE
      (p_slot_ids IS NULL OR id = ANY(p_slot_ids))
      AND (p_provider_id IS NULL OR public.slot_provider_name_key(provider) = ANY(v_keys))
      AND provider <> v_target.name FOR UPDATE
  ), changed AS (
    UPDATE public.slots s SET provider = v_target.name, updated_by = auth.uid(), updated_at = now()
      FROM previous p WHERE s.id = p.id RETURNING s.id, s.name, p.provider AS old_provider
  )
  INSERT INTO public.slot_audit_log(slot_id, slot_name, action, changes, performed_by)
    SELECT id, name, 'bulk_update', jsonb_build_object('provider', jsonb_build_object('from', old_provider, 'to', v_target.name)), auth.uid()
    FROM changed;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF p_remove_source THEN
    UPDATE public.slot_providers SET is_active = false, slot_count = 0, updated_at = now() WHERE id = p_provider_id;
    INSERT INTO public.slot_audit_log(slot_name, action, changes, performed_by)
      VALUES (v_source.name, 'delete', jsonb_build_object('scope', 'provider', 'provider_id', p_provider_id,
        'moved_to_provider_id', p_target_provider_id, 'slots_updated', v_count, 'removed_from_catalog', true), auth.uid());
  END IF;
  UPDATE public.slot_providers p SET slot_count = (SELECT count(*) FROM public.slots s
    WHERE public.slot_provider_name_key(s.provider) IN (SELECT public.slot_provider_name_key(a) FROM unnest(p.aliases || ARRAY[p.name]) a)), updated_at = now();
  RETURN jsonb_build_object('slots_updated', v_count, 'provider', v_target.name, 'source_removed', p_remove_source);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_slot_provider(p_provider_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_provider public.slot_providers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role IN ('admin', 'superadmin', 'slot_modder')
      AND r.is_active = true AND (r.access_expires_at IS NULL OR r.access_expires_at > now())) THEN
    RAISE EXCEPTION 'Slot moderator access required' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(730421, 1);
  SELECT * INTO v_provider FROM public.slot_providers WHERE id = p_provider_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Provider no longer exists'; END IF;
  IF EXISTS (SELECT 1 FROM public.slots s WHERE public.slot_provider_name_key(s.provider) IN
    (SELECT public.slot_provider_name_key(a) FROM unnest(v_provider.aliases || ARRAY[v_provider.name]) a)) THEN
    RAISE EXCEPTION 'Move this provider''s slots before removing it';
  END IF;
  UPDATE public.slot_providers SET is_active = false, slot_count = 0, updated_at = now() WHERE id = p_provider_id;
  INSERT INTO public.slot_audit_log(slot_name, action, changes, performed_by)
    VALUES (v_provider.name, 'delete', jsonb_build_object('scope', 'provider', 'provider_id', p_provider_id, 'removed_from_catalog', true), auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.save_slot_provider(TEXT, UUID, TEXT, TEXT, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.move_slot_provider_slots(UUID, UUID, UUID[], BOOLEAN, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_slot_provider(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_slot_provider(TEXT, UUID, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_slot_provider_slots(UUID, UUID, UUID[], BOOLEAN, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_slot_provider(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slot_provider_counts() TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
