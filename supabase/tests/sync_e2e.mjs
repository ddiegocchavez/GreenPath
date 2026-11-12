// Prueba E2E de sync_usage contra el proyecto real. Crea 2 usuarios de prueba y los borra al final.
const URL = process.env.SB_URL, PUB = process.env.SB_PUB, SECRET = process.env.SB_SECRET;
const admin = (p, o = {}) => fetch(`${URL}${p}`, { ...o, headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json', ...(o.headers || {}) } });
const ok = (c, m) => console.log(`${c ? 'PASA' : 'FALLA'} · ${m}`);

async function mkUser(email) {
  const r = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password: 'Prueba-GreenPath-2026!', email_confirm: true }) });
  const u = await r.json();
  const t = await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: PUB, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Prueba-GreenPath-2026!' }) }).then(r => r.json());
  return { id: u.id, jwt: t.access_token };
}
const rest = (jwt, p, o = {}) => fetch(`${URL}/rest/v1${p}`, { ...o, headers: { apikey: PUB, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json', ...(o.headers || {}) } });
const sync = (jwt, payload) => rest(jwt, '/rpc/sync_usage', { method: 'POST', body: JSON.stringify({ payload }) }).then(async r => ({ status: r.status, body: await r.json() }));

const device = crypto.randomUUID();
const base = (observed, ms) => ({
  schema_version: 1, device_id: device, device_label: 'Prueba', timezone: 'America/Mexico_City',
  local_date: '2026-11-12', period_start: '2026-11-12T00:00:00-06:00', period_end: observed, observed_at: observed,
  source: 'android_usagestats', is_demo: true,
  items: [{ app_id: 'com.android.chrome', app_label: 'Chrome', foreground_ms: ms }, { app_id: 'com.whatsapp', app_label: 'WhatsApp', foreground_ms: 60000 }],
});

const A = await mkUser(`prueba-a-${Date.now()}@greenpath.test`);
const B = await mkUser(`prueba-b-${Date.now()}@greenpath.test`);
try {
  let r = await sync(A.jwt, base('2026-11-12T15:00:00-06:00', 120000));
  ok(r.status === 200 && r.body.apps_saved === 2, `primer envío guarda 2 apps (${JSON.stringify(r.body)})`);

  r = await sync(A.jwt, base('2026-11-12T15:00:00-06:00', 120000));
  ok(r.body.apps_saved === 0 && r.body.ignored_as_older === 2, 'repetir el mismo envío no cambia nada');

  r = await sync(A.jwt, base('2026-11-12T15:30:00-06:00', 300000));
  ok(r.body.apps_saved === 2, 'un envío más reciente reemplaza');

  r = await sync(A.jwt, base('2026-11-12T14:00:00-06:00', 999));
  ok(r.body.apps_saved === 0, 'un envío más antiguo NO sobrescribe');

  const rows = await rest(A.jwt, '/usage_daily?select=app_id,foreground_ms&order=app_id').then(r => r.json());
  ok(rows.length === 2 && rows.find(x => x.app_id === 'com.android.chrome').foreground_ms === 300000, `no hay duplicados y Chrome = 300000 ms (${JSON.stringify(rows)})`);

  const seenByB = await rest(B.jwt, '/usage_daily?select=app_id').then(r => r.json());
  ok(Array.isArray(seenByB) && seenByB.length === 0, 'la cuenta B no ve el uso de A');

  r = await sync(B.jwt, base('2026-11-12T16:00:00-06:00', 1));
  ok(r.status !== 200, `B no puede escribir en el dispositivo de A (${r.status} ${r.body.message || ''})`);

  const anon = await fetch(`${URL}/rest/v1/usage_daily?select=app_id`, { headers: { apikey: PUB } });
  const anonBody = await anon.json();
  ok(anon.status !== 200 || anonBody.length === 0, `sin sesión no se lee uso (${anon.status})`);

  const cat = await fetch(`${URL}/rest/v1/recommendations?select=id`, { headers: { apikey: PUB } });
  ok(cat.status === 200, `el catálogo es legible sin sesión (${cat.status})`);
} finally {
  for (const u of [A, B]) await admin(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
  console.log('usuarios de prueba borrados');
}
