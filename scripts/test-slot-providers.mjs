import assert from 'node:assert/strict';
import { createProviderTestDatabase, providerTestId as uid } from './slot-provider-test-db.mjs';

const db = await createProviderTestDatabase();
const sql = async (query, params = []) => (await db.query(query, params)).rows;
const asUser = async n => {
  await db.exec('RESET ROLE; SET ROLE authenticated;');
  await sql("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid(n)]);
};
const save = (name, id = null, logo = null, aliases = []) => sql('SELECT public.save_slot_provider($1,$2,$3,NULL,$4) result', [name, id, logo, aliases]);
const move = (target, source = null, ids = null, remove = false, aliases = []) => sql('SELECT public.move_slot_provider_slots($1,$2,$3,$4,$5) result', [target, source, ids, remove, aliases]);

try {
  await asUser(1);
  const alpha = (await save('Alpha', null, '/providers/alpha.png'))[0].result.provider;
  const beta = (await save('Beta'))[0].result.provider;
  for (const [n, provider] of [[11, 'Alpha'], [12, 'Alpha Gaming'], [13, 'Alpha'], [14, 'Beta']]) {
    await sql('INSERT INTO slots(id,name,provider,image) VALUES($1,$2,$3,$4)', [uid(n), `Slot ${n}`, provider, '/player.webp']);
  }
  const renamed = (await save('Alpha New', alpha.id, '/custom-logo.png', ['Alpha', 'Alpha Gaming']))[0].result;
  assert.equal(renamed.slots_updated, 3);
  assert.equal(renamed.provider.slot_count, 3);
  assert.equal((await sql('SELECT count(*)::int n FROM slots WHERE provider=$1', ['Alpha New']))[0].n, 3);
  assert.equal((await sql("SELECT count(*)::int n FROM slot_audit_log WHERE action='bulk_update'"))[0].n, 3);
  await assert.rejects(save('Beta', alpha.id), /already exists/);
  assert.equal((await sql('SELECT name FROM slot_providers WHERE id=$1', [alpha.id]))[0].name, 'Alpha New');
  await assert.rejects(save('Unsafe', null, 'javascript:alert(1)'), /Logo must/);
  await assert.rejects(save(''), /provider name/);
  await assert.rejects(move(beta.id, alpha.id, []), /Select at least/);
  await assert.rejects(move(beta.id, alpha.id, [uid(11), uid(99)]), /unavailable/);
  assert.equal((await sql('SELECT provider FROM slots WHERE id=$1', [uid(11)]))[0].provider, 'Alpha New');
  assert.equal((await move(beta.id, null, [uid(11)]))[0].result.slots_updated, 1);
  await assert.rejects(move(alpha.id, alpha.id), /different/);
  await assert.rejects(sql('SELECT remove_slot_provider($1)', [alpha.id]), /Move this provider/);

  // Audit failures roll back both the provider rename and every affected slot.
  await db.exec('RESET ROLE; REVOKE INSERT ON slot_audit_log FROM authenticated;');
  await asUser(1);
  await assert.rejects(save('Must Roll Back', alpha.id), /permission denied/);
  assert.equal((await sql('SELECT name FROM slot_providers WHERE id=$1', [alpha.id]))[0].name, 'Alpha New');
  assert.equal((await sql('SELECT provider FROM slots WHERE id=$1', [uid(12)]))[0].provider, 'Alpha New');
  await db.exec('RESET ROLE; GRANT INSERT ON slot_audit_log TO authenticated;');
  await asUser(2);
  const allMoved = (await move(beta.id, alpha.id, null, true))[0].result;
  assert.equal(allMoved.slots_updated, 2);
  assert.equal((await sql('SELECT is_active FROM slot_providers WHERE id=$1', [alpha.id]))[0].is_active, false);
  await assert.rejects(sql("INSERT INTO slots(name,provider,image) VALUES('Stale import','Alpha Gaming','/player.webp')"), /Provider has been removed/);
  await assert.rejects(sql("UPDATE slots SET provider='Alpha New' WHERE id=$1", [uid(11)]), /Provider has been removed/);
  assert.equal((await sql('SELECT slot_count FROM slot_providers WHERE id=$1', [beta.id]))[0].slot_count, 4);
  const restored = (await save('Alpha Restored', alpha.id, ''))[0].result.provider;
  assert.equal(restored.is_active, true);
  assert.equal(restored.logo_url, '');
  await sql('SELECT remove_slot_provider($1)', [alpha.id]);
  assert.equal((await sql('SELECT count(*)::int n FROM slots'))[0].n, 4, 'Removing providers never deletes slots');

  for (const user of [3, 4]) {
    await asUser(user);
    await assert.rejects(save('Forbidden'), /access required/);
    await assert.rejects(move(beta.id, null, [uid(11)]), /access required/);
    await assert.rejects(sql('SELECT remove_slot_provider($1)', [beta.id]), /access required/);
    assert.equal((await sql("UPDATE slot_providers SET name='Forbidden direct edit' WHERE id=$1 RETURNING id", [beta.id])).length, 0);
  }
  await asUser(5);
  await save('Superadmin provider');
  await db.exec('RESET ROLE; SET ROLE anon;');
  await assert.rejects(save('Anonymous'), /permission denied/);
  await asUser(1);
  const counts = await sql('SELECT * FROM get_slot_provider_counts()');
  assert.deepEqual(counts.map(row => [row.provider, Number(row.slot_count)]), [['Beta', 4]]);
  console.log('Provider SQL passed: CRUD, aliases, logos, selected/all moves, rollback, audit trail, removal/restore, counts, admin/moderator/superadmin access and anonymous/expired/viewer denials.');
} finally {
  await db.close();
}
