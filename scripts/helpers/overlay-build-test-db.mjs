export function createOverlayTestDatabase(initial = {}) {
  const tables = structuredClone(initial);
  const calls = [];
  const state = { tables, calls, delay: 0, failSave: false };
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
        upsert(value, options = {}) { action = 'upsert'; payload = value; conflictKey = options.onConflict; return query; },
        async then(resolve, reject) {
          try {
            calls.push({ table, action, filters: structuredClone(filters), payload: structuredClone(payload) });
            if (action === 'update' && state.delay) await new Promise((done) => setTimeout(done, state.delay));
            if (action === 'update' && state.failSave) return resolve({ data: null, error: new Error('Test save failed') });
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
            }
            const project = (row) => columns === '*' ? structuredClone(row) : Object.fromEntries(columns.split(',').map((key) => {
              if (key === 'name:draft_layout->>name') return ['name', row.draft_layout?.name];
              return [key.trim(), structuredClone(row[key.trim()])];
            }));
            return resolve({ data: single ? (rows[0] ? project(rows[0]) : null) : rows.map(project), error: null });
          } catch (error) { return reject(error); }
        },
      };
      return query;
    },
    channel() { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
    removeChannel() {},
  };
  return { client, state };
}
