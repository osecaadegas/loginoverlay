-- Community previews and imports contain the displayed design only. Older
-- shared rows are preserved; filtering happens when they are read.
create or replace function overlay_access_private.community_active_config(
  widget_type text, config jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  cleaned jsonb := coalesce(config, '{}'::jsonb) - 'styleConfigs';
  mode text;
begin
  if widget_type = 'background' then
    mode := coalesce(nullif(cleaned #>> '{subElements,source,bgMode}', ''), cleaned ->> 'bgMode', 'texture');
    if mode <> 'image' then
      cleaned := (cleaned - 'imageUrl') #- '{subElements,media,imageUrl}';
    end if;
    if mode <> 'video' then
      cleaned := (cleaned - 'videoUrl') #- '{subElements,media,videoUrl}';
    end if;
  end if;
  return cleaned;
end;
$$;
revoke all on function overlay_access_private.community_active_config(text,jsonb)
  from public, anon, authenticated;

create or replace function overlay_access_private.community_active_layout(doc jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(doc) = 'object' and jsonb_typeof(doc -> 'instances') = 'array'
    then jsonb_set(doc, '{instances}', coalesce((
      select jsonb_agg(
        case when jsonb_typeof(item.value -> 'config') = 'object'
          then jsonb_set(item.value, '{config}',
            overlay_access_private.community_active_config(
              item.value ->> 'widgetType', item.value -> 'config'))
          else item.value end
        order by item.ordinality
      )
      from jsonb_array_elements(doc -> 'instances') with ordinality as item(value, ordinality)
      where item.value ->> 'visible' is distinct from 'false'
    ), '[]'::jsonb))
    else doc
  end;
$$;
revoke all on function overlay_access_private.community_active_layout(jsonb)
  from public, anon, authenticated;

-- This predicate uses the authenticated caller's identity, never a supplied
-- user ID. It also protects the table's metadata-only SELECT grant.
create or replace function overlay_access_private.can_browse_community_layout(doc jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare requester uuid := (select auth.uid());
begin
  if requester is null then return false; end if;
  perform overlay_access_private.assert_access(
    requester, overlay_access_private.community_active_layout(doc));
  return true;
exception when insufficient_privilege then
  return false;
end;
$$;
revoke all on function overlay_access_private.can_browse_community_layout(jsonb)
  from public, anon, authenticated;
grant execute on function overlay_access_private.can_browse_community_layout(jsonb)
  to authenticated;

alter policy "Authenticated users can browse shared overlay metadata"
  on public.shared_overlay_templates
  using (overlay_access_private.can_browse_community_layout(layout));

create or replace function overlay_access_private.browse_shared_overlay_templates()
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  requester uuid := (select auth.uid());
  template public.shared_overlay_templates%rowtype;
  active_layout jsonb;
begin
  if requester is null then
    raise exception 'Sign in to browse community overlays.' using errcode = '42501';
  end if;
  for template in
    select * from public.shared_overlay_templates order by created_at desc
  loop
    active_layout := overlay_access_private.community_active_layout(template.layout);
    begin
      perform overlay_access_private.assert_access(requester, active_layout);
    exception when insufficient_privilege then
      continue;
    end;
    return next jsonb_build_object(
      'id', template.id, 'owner_id', template.owner_id,
      'name', template.name, 'description', template.description,
      'layout', active_layout, 'preview', template.preview,
      'widget_types', template.widget_types,
      'schema_version', template.schema_version,
      'created_at', template.created_at, 'updated_at', template.updated_at
    );
  end loop;
end;
$$;

create or replace function overlay_access_private.load_shared_overlay_template(p_template_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  requester uuid := (select auth.uid());
  template public.shared_overlay_templates%rowtype;
  active_layout jsonb;
begin
  if requester is null then
    raise exception 'Sign in to load a community overlay.' using errcode = '42501';
  end if;
  select * into template from public.shared_overlay_templates where id = p_template_id;
  if not found then
    raise exception 'This shared overlay is no longer available.' using errcode = 'P0002';
  end if;
  active_layout := overlay_access_private.community_active_layout(template.layout);
  perform overlay_access_private.assert_access(requester, active_layout);
  return jsonb_build_object(
    'id', template.id, 'name', template.name,
    'layout', active_layout, 'schemaVersion', template.schema_version
  );
end;
$$;
