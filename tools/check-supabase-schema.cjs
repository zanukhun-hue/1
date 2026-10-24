/* Real PostgreSQL/RLS checks in memory; never connects to the live Supabase. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');

(async () => {
  const db = new PGlite();
  try {
    // Supabase supplies these roles and Storage schema. PGlite has core UUIDs,
    // but does not bundle pgcrypto, so only that extension statement is omitted.
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema storage;
      create table storage.buckets (id text primary key, name text, public boolean);
    `);
    const sql = fs.readFileSync(path.join(root, 'supabase_schema.sql'), 'utf8')
      .replace(/^create extension if not exists pgcrypto;\r?\n/m, '');
    await db.exec(sql);
    await db.exec(`
      insert into public.edit_submissions (url,platform,title,author,status) values
        ('https://example.com/approved','video','Approved','Author','approved'),
        ('https://example.com/pending','video','Pending','Author','pending');
      -- Reproduce the previously deployed permissive policies/grants.
      grant update on public.edit_submissions to anon, authenticated;
      drop policy "Public can read approved edits" on public.edit_submissions;
      create policy "Public can read approved edits" on public.edit_submissions
        for select to anon, authenticated using (status in ('approved','pending'));
      create policy "Public can cancel pending edits" on public.edit_submissions
        for update to anon, authenticated using (status='pending') with check (status='rejected');
      update storage.buckets set public=false where id='thumbs';
    `);
    await db.exec(sql);
    await db.exec(sql);
    assert.equal((await db.query('select count(*)::int as n from edit_submissions')).rows[0].n, 2);
    assert.equal((await db.query("select public from storage.buckets where id='thumbs'")).rows[0].public, true);
    const denied = query => assert.rejects(db.query(query), error => error.code === '42501');
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await db.query("insert into site_visits (path,visitor_hash) values ('/plugins','test-visitor')");
      await db.query("insert into site_events (event_type,plugin_id) values ('download','flow')");
      await db.query("insert into plugin_reports (plugin_id,plugin_name) values ('flow','Flow')");
      await db.query("insert into plugin_requests (name) values ('Requested plugin')");
      await db.query("insert into edit_submissions (url,platform,title,author) values ('https://example.com/new','video','New','Author')");
      assert.deepEqual((await db.query('select status from edit_submissions')).rows, [{ status: 'approved' }]);
      assert.ok((await db.query('select id from site_events')).rows.length);
      assert.ok((await db.query('select id from site_visits')).rows.length);
      await denied('select * from plugin_reports');
      await denied('select * from plugin_requests');
      await denied("insert into plugin_reports (plugin_id,plugin_name,status) values ('x','X','done')");
      await denied("insert into plugin_requests (name,status) values ('X','done')");
      await denied("insert into edit_submissions (url,platform,title,author,status) values ('x','video','X','X','approved')");
      await denied("insert into site_visits (path,visitor_hash) values (repeat('x',301),'x')");
      await denied("insert into site_visits (path,visitor_hash) values ('/',repeat('x',121))");
      await denied("update edit_submissions set status='rejected' where status='pending'");
      await denied('delete from edit_submissions');
      await denied('truncate site_events');
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    const moderated = await db.query("update edit_submissions set status='rejected' where title='Pending' returning status");
    assert.deepEqual(moderated.rows, [{ status: 'rejected' }]);
    await db.exec('reset role');

    // Exercise the actual report helper with PostgreSQL access rules, including
    // anonymous INSERT without RETURNING and admin INSERT with a returned ID.
    let admin = false;
    const source = fs.readFileSync(path.join(root, 'server-original.js'), 'utf8')
      .match(/async function insertPluginReport\(clean\) \{[\s\S]*?(?=\r?\napp\.post)/)[0];
    const context = {
      serviceReady: () => admin,
      supabaseRequest: async (table, options, useAdmin) => {
        assert.equal(table, 'plugin_reports');
        assert.equal(useAdmin, admin);
        assert.equal(options.headers.Prefer, admin ? 'return=representation' : 'return=minimal');
        const report = JSON.parse(options.body);
        await db.exec(`set role ${useAdmin ? 'service_role' : 'anon'}`);
        try {
          const result = await db.query(
            'insert into plugin_reports (plugin_id,plugin_name,message,status) values ($1,$2,$3,$4)' +
            (useAdmin ? ' returning *' : ''),
            [report.plugin_id, report.plugin_name, report.message, report.status]
          );
          return useAdmin ? result.rows : null;
        } finally { await db.exec('reset role'); }
      }
    };
    vm.runInNewContext(source, context);
    const report = { plugin_id: 'flow', plugin_name: 'Flow', message: 'Test only', status: 'pending' };
    assert.equal(await context.insertPluginReport(report), null);
    admin = true;
    assert.ok((await context.insertPluginReport(report)).id);
    console.log('PASS: repeatable schema and data preservation; anon/authenticated RLS; admin moderation; report inserts with/without server key');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
