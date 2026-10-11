-- Overlay-only groups never confer account, billing or administrative privileges.
create schema if not exists overlay_access_private;
revoke all on schema overlay_access_private from public;
grant usage on schema overlay_access_private to authenticated;

create function overlay_access_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid()
 and role in ('admin','superadmin') and is_active
 and (access_expires_at is null or access_expires_at>now()));
$$;
revoke all on function overlay_access_private.is_admin() from public;
grant execute on function overlay_access_private.is_admin() to authenticated;

create table public.overlay_access_roles (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 60),
 description text not null default '' check(length(description)<=500),
 created_at timestamptz not null default now()
);
create unique index overlay_access_roles_name on public.overlay_access_roles(lower(name));
create table public.overlay_access_members (
 role_id uuid references public.overlay_access_roles on delete cascade,
 user_id uuid references auth.users on delete cascade,
 primary key(role_id,user_id)
);
create index overlay_access_members_user on public.overlay_access_members(user_id);
create table public.overlay_access_assets (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('theme','background','banner')),
 asset_key text not null check(length(asset_key) between 1 and 2000),
 label text not null check(length(trim(label)) between 1 and 120),
 media_type text not null default 'image' check(media_type in ('image','video')),
 restricted boolean not null default true,
 unique(kind,asset_key),
 check(kind='theme' or asset_key ~ '^(https://|/[^/])'),
 check(asset_key !~ '[\n\r|]')
);
create table public.overlay_access_grants (
 asset_id uuid references public.overlay_access_assets on delete cascade,
 role_id uuid references public.overlay_access_roles on delete cascade,
 primary key(asset_id,role_id)
);
create index overlay_access_grants_role on public.overlay_access_grants(role_id);

alter table public.overlay_access_roles enable row level security;
alter table public.overlay_access_members enable row level security;
alter table public.overlay_access_assets enable row level security;
alter table public.overlay_access_grants enable row level security;
revoke all on public.overlay_access_roles,public.overlay_access_members,public.overlay_access_assets,public.overlay_access_grants from anon,authenticated;
grant select,insert,update,delete on public.overlay_access_roles,public.overlay_access_members,public.overlay_access_assets,public.overlay_access_grants to authenticated;
create policy overlay_roles_admin on public.overlay_access_roles for all to authenticated using(overlay_access_private.is_admin()) with check(overlay_access_private.is_admin());
create policy overlay_members_admin on public.overlay_access_members for all to authenticated using(overlay_access_private.is_admin()) with check(overlay_access_private.is_admin());
create policy overlay_assets_admin on public.overlay_access_assets for all to authenticated using(overlay_access_private.is_admin()) with check(overlay_access_private.is_admin());
create policy overlay_grants_admin on public.overlay_access_grants for all to authenticated using(overlay_access_private.is_admin()) with check(overlay_access_private.is_admin());

create function overlay_access_private.allowed(p_owner uuid,p_asset uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.overlay_access_assets a where a.id=p_asset and
 (not a.restricted or exists(select 1 from public.overlay_access_members m join public.overlay_access_grants g using(role_id) where m.user_id=p_owner and g.asset_id=a.id)
 or exists(select 1 from public.user_roles r where r.user_id=p_owner and r.role in ('admin','superadmin') and r.is_active and (r.access_expires_at is null or r.access_expires_at>now()))));
$$;
revoke all on function overlay_access_private.allowed(uuid,uuid) from public;

-- Public OBS needs asset entitlements, never membership lists or role names.
create function public.get_overlay_asset_access(p_owner uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'kind',a.kind,'key',a.asset_key,'label',a.label,'mediaType',a.media_type,'restricted',a.restricted,'allowed',overlay_access_private.allowed(p_owner,a.id))),'[]'::jsonb) from public.overlay_access_assets a;
$$;
revoke all on function public.get_overlay_asset_access(uuid) from public;
grant execute on function public.get_overlay_asset_access(uuid) to anon,authenticated;

create function overlay_access_private.theme_key(value text) returns text
language sql immutable set search_path='' as $$
 select case regexp_replace(lower(value),'^theme_','') when 'ice' then 'arctic' when 'greek' then 'old_rome' when 'space' then 'orbital' else regexp_replace(lower(value),'^theme_','') end;
$$;
create function overlay_access_private.has_theme(doc jsonb,theme text) returns boolean
language plpgsql immutable set search_path='' as $$
declare item record;
begin
 if jsonb_typeof(doc)='object' then
  for item in select * from jsonb_each(doc) loop
   if item.key in ('colourTheme','colour','theme','betTheme') and jsonb_typeof(item.value)='string' and overlay_access_private.theme_key(item.value#>>'{}')=overlay_access_private.theme_key(theme) then return true; end if;
   if overlay_access_private.has_theme(item.value,theme) then return true; end if;
  end loop;
 elsif jsonb_typeof(doc)='array' then
  for item in select value from jsonb_array_elements(doc) loop
   if overlay_access_private.has_theme(item.value,theme) then return true; end if;
  end loop;
 end if;
 return false;
end;
$$;
create function overlay_access_private.decode_url(value text) returns text
language plpgsql immutable set search_path='' as $$
declare encoded text;
begin
 for encoded in select distinct m[1] from regexp_matches(value,'((?:%[0-9a-fA-F]{2})+)','g') m loop
  begin
   value:=replace(value,encoded,convert_from(decode(replace(encoded,'%',''),'hex'),'UTF8'));
  exception when others then null;
  end;
 end loop;
 return lower(value);
end;
$$;
create function overlay_access_private.asset_used(doc jsonb,kind text,asset text) returns boolean
language sql immutable set search_path='' as $$
 select case when kind='theme' then overlay_access_private.has_theme(doc,asset)
 else strpos(overlay_access_private.decode_url(doc::text),split_part(split_part(overlay_access_private.decode_url(asset),'?',1),'#',1))>0 end;
$$;
create function overlay_access_private.assert_access(p_owner uuid,doc jsonb) returns void
language plpgsql stable security definer set search_path='' as $$
declare blocked text;
begin
 select a.label into blocked from public.overlay_access_assets a where a.restricted
 and not overlay_access_private.allowed(p_owner,a.id)
 and overlay_access_private.asset_used(doc,a.kind,a.asset_key) limit 1;
 if blocked is not null then raise exception 'Exclusive overlay asset "%" requires an assigned overlay role. Choose another asset or ask an administrator.',blocked using errcode='42501'; end if;
end;
$$;
create function overlay_access_private.check_widget_write() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='overlay_widgets' then
  perform overlay_access_private.assert_access(new.user_id,new.config);
 elsif tg_table_name='better_editor_overlays' then
  perform overlay_access_private.assert_access(new.user_id,new.draft_layout);
  if tg_op='INSERT' or new.published_layout is distinct from old.published_layout then perform overlay_access_private.assert_access(new.user_id,new.published_layout); end if;
 else
  perform overlay_access_private.assert_access(new.owner_user_id,new.published_layout);
 end if;
 return new;
end;
$$;
revoke all on all functions in schema overlay_access_private from public;
grant execute on function overlay_access_private.is_admin() to authenticated;
create trigger overlay_exclusive_widget_write before insert or update of config on public.overlay_widgets for each row execute function overlay_access_private.check_widget_write();
create trigger overlay_exclusive_editor_write before insert or update of draft_layout,published_layout on public.better_editor_overlays for each row execute function overlay_access_private.check_widget_write();
create trigger overlay_exclusive_publication_write before insert or update of published_layout on public.better_overlay_publications for each row execute function overlay_access_private.check_widget_write();

-- Atomic asset/grant replacement: no temporary public window or lost grants.
create function public.save_overlay_access_asset(p_asset jsonb,p_roles uuid[]) returns uuid
language plpgsql security definer set search_path='' as $$
declare saved_asset_id uuid;
begin
 if not overlay_access_private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 insert into public.overlay_access_assets(kind,asset_key,label,media_type,restricted)
 values(p_asset->>'kind',p_asset->>'key',p_asset->>'label',coalesce(p_asset->>'mediaType','image'),coalesce((p_asset->>'restricted')::boolean,true))
 on conflict(kind,asset_key) do update set label=excluded.label,media_type=excluded.media_type,restricted=excluded.restricted returning id into saved_asset_id;
 delete from public.overlay_access_grants where overlay_access_grants.asset_id=saved_asset_id;
 insert into public.overlay_access_grants select saved_asset_id,r from (select distinct unnest(p_roles) r) roles;
 return saved_asset_id;
end;
$$;
revoke all on function public.save_overlay_access_asset(jsonb,uuid[]) from public;
grant execute on function public.save_overlay_access_asset(jsonb,uuid[]) to authenticated;
