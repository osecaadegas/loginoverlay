-- Return complete sanitized templates for exact community previews while
-- preserving the exclusive-asset entitlement boundary for the viewer.

create function overlay_access_private.browse_shared_overlay_templates()
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  requester uuid := (select auth.uid());
  template public.shared_overlay_templates%rowtype;
begin
  if requester is null then
    raise exception 'Sign in to browse community overlays.' using errcode = '42501';
  end if;

  for template in
    select *
      from public.shared_overlay_templates
      order by created_at desc
  loop
    begin
      perform overlay_access_private.assert_access(requester, template.layout);
    exception
      when insufficient_privilege then
        continue;
    end;

    return next jsonb_build_object(
      'id', template.id,
      'owner_id', template.owner_id,
      'name', template.name,
      'description', template.description,
      'layout', template.layout,
      'preview', template.preview,
      'widget_types', template.widget_types,
      'schema_version', template.schema_version,
      'created_at', template.created_at,
      'updated_at', template.updated_at
    );
  end loop;
end;
$$;

revoke all on function overlay_access_private.browse_shared_overlay_templates()
  from public, anon, authenticated;
grant execute on function overlay_access_private.browse_shared_overlay_templates()
  to authenticated;

create function public.browse_shared_overlay_templates()
returns setof jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select * from overlay_access_private.browse_shared_overlay_templates();
$$;

revoke all on function public.browse_shared_overlay_templates()
  from public, anon, authenticated;
grant execute on function public.browse_shared_overlay_templates()
  to authenticated;
