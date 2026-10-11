-- Supabase projects can grant EXECUTE directly through default privileges,
-- independently of PUBLIC. Remove those explicit grants as well.
revoke all on all functions in schema overlay_access_private from anon,authenticated;
grant execute on function overlay_access_private.is_admin() to authenticated;
revoke all on function public.save_overlay_access_asset(jsonb,uuid[]) from public,anon,authenticated;
alter function public.save_overlay_access_asset(jsonb,uuid[]) security invoker;
grant execute on function public.save_overlay_access_asset(jsonb,uuid[]) to authenticated;
revoke all on function public.get_overlay_asset_access(uuid) from public,anon,authenticated;
grant execute on function public.get_overlay_asset_access(uuid) to anon,authenticated;
