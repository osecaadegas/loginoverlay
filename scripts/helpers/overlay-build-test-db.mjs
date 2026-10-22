export function createOverlayTestDatabase(initial = {}) {
  const tables = structuredClone(initial);
  const calls = [];
  const state = { tables, calls, delay: 0, failSave: false, failPublication: false };
  const client = {
    from(table) {
      const filters = [];
      let action = 'read', payload, single = false, limit = Infinity, columns = '*', conflictKey;
      const query = {
        select(value = '*') { columns = value; return query; },
        eq(key, value) { filters.push([key, value]); return query; },
        in(key, values) { filters.push([key, values]); return query; },
        gte(key, value) { filters.push([key, value, 'gte']); return query; },
        is(key, value) { return query.eq(key, value); },
        order() { return query; },
        limit(value) { limit = value; return query; },
        maybeSingle() { single = true; return query; },
        single() { single = true; return query; },
        update(value) { action = 'update'; payload = value; return query; },
        insert(value) { action = 'insert'; payload = value; return query; },
        delete() { action = 'delete'; return query; },
        upsert(value, options = {}) { action = 'upsert'; payload = value; conflictKey = options.onConflict; return query; },
        async then(resolve, reject) {
          try {
            calls.push({ table, action, filters: structuredClone(filters), payload: structuredClone(payload) });
            if (action === 'update' && state.delay) await new Promise((done) => setTimeout(done, state.delay));
            if (action === 'update' && state.failSave) return resolve({ data: null, error: new Error('Test save failed') });
            if (table === 'better_overlay_publications' && action === 'upsert' && state.failPublication) return resolve({ data: null, error: new Error('Test publication failed') });
            tables[table] ||= [];
            let rows = tables[table].filter((row) => filters.every(([key, value, operator]) => operator === 'gte' ? row[key] >= value : Array.isArray(value) ? value.includes(row[key]) : row[key] === value)).slice(0, limit);
            if (action === 'insert' || action === 'upsert') {
              let row = action === 'upsert' && tables[table].find((item) => item[conflictKey] === payload[conflictKey]);
              if (!row) {
                row = { id: crypto.randomUUID(), created_at: new Date().toISOString() };
                tables[table].push(row);
              }
              Object.assign(row, structuredClone(payload));
              rows = [row];
            } else if (action === 'update') {
              rows.forEach((row) => Object.assign(row, structuredClone(payload)));
            } else if (action === 'delete') {
              const deleted = new Set(rows);
              tables[table] = tables[table].filter((row) => !deleted.has(row));
            }
            const project = (row) => columns === '*' ? structuredClone(row) : Object.fromEntries(columns.split(',').map((key) => {
              if (key === 'name:draft_layout->>name') return ['name', row.draft_layout?.name];
              if (key === 'preview:draft_layout->preview') return ['preview', row.draft_layout?.preview];
              return [key.trim(), structuredClone(row[key.trim()])];
            }));
            return resolve({ data: single ? (rows[0] ? project(rows[0]) : null) : rows.map(project), error: null });
          } catch (error) { return reject(error); }
        },
      };
      return query;
    },
    async rpc(name, args = {}) {
      calls.push({ rpc: name, args: structuredClone(args) });
      if (name === 'browse_shared_overlay_templates') {
        return {
          data: structuredClone(tables.shared_overlay_templates || []),
          error: null,
        };
      }
      if (name === 'load_shared_overlay_template') {
        const row = (tables.shared_overlay_templates || []).find((item) => item.id === args.p_template_id);
        return row
          ? { data: { id: row.id, name: row.name, layout: structuredClone(row.layout), schemaVersion: row.schema_version }, error: null }
          : { data: null, error: new Error('This shared overlay is no longer available.') };
      }
      if (name === 'delete_better_editor_overlay') {
        if (state.failDelete) return { data: null, error: new Error('Test delete failed') };
        const row = (tables.better_editor_overlays || []).find((item) => item.id === args.p_overlay_id);
        if (!row) return { data: false, error: null };
        const publication = (tables.better_overlay_publications || []).find((item) => item.public_overlay_id === row.public_overlay_id);
        if (publication) publication.revoked_at = new Date().toISOString();
        tables.better_editor_overlays = tables.better_editor_overlays.filter((item) => item.id !== row.id);
        return { data: true, error: null };
      }
      return { data: null, error: new Error(`Unsupported test RPC: ${name}`) };
    },
    channel() { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
    removeChannel() {},
  };
  return { client, state };
}
