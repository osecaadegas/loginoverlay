import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Install only for local verification; not an application dependency.
const { PGlite } = await import('../.codex-dev/review-test-deps/node_modules/@electric-sql/pglite/dist/index.js');
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  INSERT INTO auth.users VALUES ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002');`);
await db.exec(readFileSync(new URL('../migrations/20260922014434_subscriber_reviews.sql', import.meta.url), 'utf8'));
const insert = `INSERT INTO public.service_reviews(user_id,display_name,rating,body,product_code,stripe_subscription_id,stripe_customer_id,original_period_end,reward_period_end)
  VALUES ('10000000-0000-4000-8000-000000000001','Test subscriber',1,'Honest feedback with more than twenty characters.','streamer_premium','sub_test','cus_test',2000000000,2000259200)`;
await db.exec(`SET ROLE service_role; ${insert}; RESET ROLE;`);
assert.equal((await db.query('SELECT count(*) FROM public.service_reviews')).rows[0].count, 1);
await assert.rejects(db.exec(insert), /unique constraint/);
const other = insert.replace('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');
await assert.rejects(db.exec(other.replace("subscriber',1,", "subscriber',6,")), /check constraint/);
await assert.rejects(db.exec(other.replace('2000259200', '2000259201')), /exactly_three_reward_days/);
await assert.rejects(db.exec("UPDATE public.service_reviews SET reward_status='applied'"), /applied_reward_has_timestamp/);
for (const role of ['anon', 'authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  for (const sql of ['SELECT * FROM public.service_reviews', insert, 'UPDATE public.service_reviews SET rating=5', 'DELETE FROM public.service_reviews', 'SELECT public.service_review_summary()']) {
    await assert.rejects(db.exec(sql), /permission denied/);
  }
  await db.exec('RESET ROLE');
}
await db.exec('SET ROLE service_role');
assert.deepEqual((await db.query('SELECT public.service_review_summary() AS summary')).rows[0].summary, { count: 1, average: 1 });
await db.exec("UPDATE public.service_reviews SET published=false, reward_status='applied', rewarded_at=now()");
assert.equal((await db.query('SELECT public.service_review_summary() AS summary')).rows[0].summary.count, 0);
await assert.rejects(db.exec('DELETE FROM public.service_reviews'), /permission denied/);
await db.exec('RESET ROLE');
assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE relname='service_reviews'")).rows[0].relrowsecurity, true);
await db.close();
console.log('Review migration passed: SQL, uniqueness, reward constraints, RLS, grants, summary and retained reward ledger.');
