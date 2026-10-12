-- Authenticated community library for Better Editor layouts.
-- Metadata is directly readable; the full layout is returned only through the
-- entitlement-aware load_shared_overlay_template RPC.

create table public.shared_overlay_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  description text not null default '' check (length(description) <= 500),
  layout jsonb not null check (jsonb_typeof(layout) = 'object'),
  preview jsonb not null default '[]'::jsonb check (jsonb_typeof(preview) = 'array'),
  widget_types text[] not null default '{}',
  schema_version smallint not null default 1 check (schema_version = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shared_overlay_templates_owner_id_idx
  on public.shared_overlay_templates(owner_id);
create index shared_overlay_templates_created_at_idx
  on public.shared_overlay_templates(created_at desc);

alter table public.shared_overlay_templates enable row level security;

revoke all on public.shared_overlay_templates from public, anon, authenticated;
grant select (
  id,
  owner_id,
  name,
  description,
  preview,
  widget_types,
  created_at,
  updated_at
) on public.shared_overlay_templates to authenticated;
grant insert (
  owner_id,
  name,
  description,
  layout,
  preview,
  widget_types,
  schema_version
) on public.shared_overlay_templates to authenticated;
grant delete on public.shared_overlay_templates to authenticated;

create policy "Authenticated users can browse shared overlay metadata"
  on public.shared_overlay_templates
  for select
  to authenticated
  using (true);

create policy "Owners can share overlay templates"
  on public.shared_overlay_templates
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners can remove shared overlay templates"
  on public.shared_overlay_templates
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create trigger set_shared_overlay_templates_updated_at
  before update on public.shared_overlay_templates
  for each row
  execute function public.set_updated_at();

create function overlay_access_private.check_shared_overlay_template_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform overlay_access_private.assert_access(new.owner_id, new.layout);
  return new;
end;
$$;

revoke all on function overlay_access_private.check_shared_overlay_template_access()
  from public, anon, authenticated;

create trigger overlay_exclusive_shared_template_write
  before insert or update of layout on public.shared_overlay_templates
  for each row
  execute function overlay_access_private.check_shared_overlay_template_access();

create function overlay_access_private.load_shared_overlay_template(p_template_id uuid)
returns jsonb
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
    raise exception 'Sign in to load a community overlay.' using errcode = '42501';
  end if;

  select *
    into template
    from public.shared_overlay_templates
    where id = p_template_id;

  if not found then
    raise exception 'This shared overlay is no longer available.' using errcode = 'P0002';
  end if;

  perform overlay_access_private.assert_access(requester, template.layout);

  return jsonb_build_object(
    'id', template.id,
    'name', template.name,
    'layout', template.layout,
    'schemaVersion', template.schema_version
  );
end;
$$;

revoke all on function overlay_access_private.load_shared_overlay_template(uuid)
  from public, anon, authenticated;
grant execute on function overlay_access_private.load_shared_overlay_template(uuid)
  to authenticated;

create function public.load_shared_overlay_template(p_template_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select overlay_access_private.load_shared_overlay_template(p_template_id);
$$;

revoke all on function public.load_shared_overlay_template(uuid)
  from public, anon, authenticated;
grant execute on function public.load_shared_overlay_template(uuid)
  to authenticated;
