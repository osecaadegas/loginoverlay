import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sql = readFileSync(new URL('../migrations/20261029130000_harden_exposed_privileged_functions.sql', import.meta.url), 'utf8');

test('auth-user lookup checks the JWT identity against an active admin role', () => {
  assert.match(sql, /auth\.role\(\) IS DISTINCT FROM 'service_role'/);
  assert.match(sql, /public\.is_admin_user\(auth\.uid\(\)\)/);
  assert.match(sql, /RAISE EXCEPTION 'Administrator access required'/);
  assert.match(sql, /SET search_path = pg_catalog, public/);
});

test('private functions revoke inherited client access and retain service access', () => {
  const signatures = [
    'get_all_auth_users\\(\\)',
    'add_viewer_points\\(uuid, text, integer\\)',
    'admin_get_player_timeline\\(uuid, integer\\)',
    'acquire_wipe_lock\\(uuid, text\\)',
  ];
  for (const signature of signatures) {
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${signature}[\\s\\S]*?FROM PUBLIC, anon, authenticated;`));
    assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${signature}[\\s\\S]*?TO (?:authenticated, )?service_role;`));
  }
});
