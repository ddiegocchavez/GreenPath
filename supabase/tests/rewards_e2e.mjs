// Prueba E2E de recompensas (weekly_reduction / claim_weekly_points) contra el proyecto real.
// Crea usuarios de prueba con datos sintéticos is_demo=true y los borra al final.
const URL = process.env.SB_URL, PUB = process.env.SB_PUB, SECRET = process.env.SB_SECRET;
const admin = (p, o = {}) => fetch(`${URL}${p}`, { ...o, headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json', ...(o.headers || {}) } });
const ok = (c, m) => console.log(`${c ? 'PASA' : 'FALLA'} · ${m}`);
const PW = 'Prueba-GreenPath-2026!';

async function mkUser(email) {
  const u = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password: PW, email_confirm: true }) }).then(r => r.json());
  const t = await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: PUB, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW }) }).then(r => r.json());
  return { id: u.id, jwt: t.access_token };
}
const rpc = (jwt, fn, body) => fetch(`${URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: PUB, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, body: await r.json() }));

const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date(); // fecha del servidor (UTC)
const dayOffset = (n) => { const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())); d.setUTCDate(d.getUTCDate() + n); return d; };
const TODAY = iso(dayOffset(0));

async function seed(jwt, device, offsets, ms) {
  for (const n of offsets) {
    const day = iso(dayOffset(n));
    await rpc(jwt, 'sync_usage', { payload: {
      schema_version: 1, device_id: device, device_label: 'Prueba', timezone: 'UTC', local_date: day,
      period_start: `${day}T00:00:00Z`, period_end: `${day}T23:59:59Z`, observed_at: `${day}T23:59:59Z`,
      source: 'android_usagestats', is_demo: true,
      items: [{ app_id: 'com.example.video', app_label: 'Video', foreground_ms: ms }],
    } });
  }
}

const A = await mkUser(`recomp-a-${Date.now()}@greenpath.test`);
const B = await mkUser(`recomp-b-${Date.now()}@greenpath.test`);
const devA = crypto.randomUUID(), devB = crypto.randomUUID();
try {
  // A: anterior (-14..-8) 3 h/día; actual (-7..-1) 2.4 h/día → 20 %.
  await seed(A.jwt, devA, [-14, -13, -12, -11, -10, -9, -8], 3 * 3600000);
  await seed(A.jwt, devA, [-7, -6, -5, -4, -3, -2, -1], 2.4 * 3600000);

  let r = await rpc(A.jwt, 'weekly_reduction', { p_device: devA, p_today: TODAY });
  ok(r.body.comparable === true && Number(r.body.reduction_pct) === 20 && r.body.points === 200,
     `20 % de reducción → 200 puntos (${r.body.reduction_pct} %, ${r.body.points} pts)`);
  ok(r.body.includes_demo_data === true, 'marca que incluye datos de demostración');

  r = await rpc(A.jwt, 'claim_weekly_points', { p_device: devA, p_today: TODAY });
  ok(r.body.ok === true && r.body.points === 200, 'reclamar otorga 200 puntos');

  r = await rpc(A.jwt, 'claim_weekly_points', { p_device: devA, p_today: TODAY });
  ok(r.body.ok === false, 'reclamar dos veces la misma ventana no otorga más');

  const ledger = await fetch(`${URL}/rest/v1/points_ledger?select=points,is_demo`, { headers: { apikey: PUB, Authorization: `Bearer ${A.jwt}` } }).then(r => r.json());
  ok(ledger.length === 1 && ledger[0].points === 200 && ledger[0].is_demo === true, `una sola fila de puntos, marcada demo (${JSON.stringify(ledger)})`);

  // B: solo 3 días → no comparable, sin puntos.
  await seed(B.jwt, devB, [-3, -2, -1], 3600000);
  r = await rpc(B.jwt, 'weekly_reduction', { p_device: devB, p_today: TODAY });
  ok(r.body.comparable === false && r.body.points === 0 && r.body.can_claim === false, `pocos días → no comparable (${r.body.reason})`);

  // B no puede reclamar sobre el dispositivo de A.
  r = await rpc(B.jwt, 'claim_weekly_points', { p_device: devA, p_today: TODAY });
  ok(r.status !== 200, `B no reclama con el dispositivo de A (${r.status})`);

  // B no ve los puntos de A.
  const seen = await fetch(`${URL}/rest/v1/points_ledger?select=points`, { headers: { apikey: PUB, Authorization: `Bearer ${B.jwt}` } }).then(r => r.json());
  ok(Array.isArray(seen) && seen.length === 0, 'B no ve los puntos de A');

  // Aumento de uso → 0 puntos, sin castigo.
  const C = await mkUser(`recomp-c-${Date.now()}@greenpath.test`);
  const devC = crypto.randomUUID();
  await seed(C.jwt, devC, [-14, -13, -12, -11, -10], 3600000);
  await seed(C.jwt, devC, [-7, -6, -5, -4, -3], 2 * 3600000);
  r = await rpc(C.jwt, 'weekly_reduction', { p_device: devC, p_today: TODAY });
  ok(r.body.comparable === true && Number(r.body.reduction_pct) === -100 && r.body.points === 0, `si el uso sube: 0 puntos (${r.body.reduction_pct} %)`);
  await admin(`/auth/v1/admin/users/${C.id}`, { method: 'DELETE' });
} finally {
  for (const u of [A, B]) await admin(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
  console.log('usuarios de prueba borrados');
}
