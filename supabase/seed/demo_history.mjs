// Carga historial de DEMOSTRACIÓN (is_demo = true) en la cuenta demo, para un dispositivo.
// No toca el día de hoy (ese se mide real). Uso:
//   SB_URL, SB_PUB, DEMO_EMAIL, DEMO_PASSWORD, DEVICE_ID  →  node supabase/seed/demo_history.mjs
const { SB_URL: URL, SB_PUB: PUB, DEMO_EMAIL, DEMO_PASSWORD, DEVICE_ID } = process.env;

const t = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: PUB, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
}).then((r) => r.json());
if (!t.access_token) throw new Error('No se pudo iniciar sesión con la cuenta demo');

const H = 3600000, M = 60000;
// Semana anterior más intensa en video; semana reciente con menos video.
const prev = [
  ['com.google.android.youtube', 'YouTube', 95 * M], ['com.instagram.android', 'Instagram', 55 * M],
  ['com.zhiliaoapp.musically', 'TikTok', 50 * M], ['com.whatsapp', 'WhatsApp', 40 * M], ['com.android.chrome', 'Chrome', 25 * M],
];
const cur = [
  ['com.google.android.youtube', 'YouTube', 70 * M], ['com.instagram.android', 'Instagram', 45 * M],
  ['com.zhiliaoapp.musically', 'TikTok', 35 * M], ['com.whatsapp', 'WhatsApp', 40 * M], ['com.android.chrome', 'Chrome', 25 * M],
];
const jitter = (ms, i) => Math.round(ms * (0.85 + ((i * 37) % 30) / 100));

const pad = (n) => String(n).padStart(2, '0');
const local = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
let sent = 0;
for (let n = 1; n <= 13; n++) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
  const day = local(d);
  const set = n >= 8 ? prev : cur;
  const payload = {
    schema_version: 1, device_id: DEVICE_ID, device_label: 'Historial de demostración', timezone: 'America/Mexico_City',
    local_date: day, period_start: `${day}T00:00:00-06:00`, period_end: `${day}T23:59:59-06:00`,
    observed_at: `${day}T23:59:59-06:00`, source: 'android_usagestats', is_demo: true,
    items: set.map(([app_id, app_label, ms], i) => ({ app_id, app_label, foreground_ms: jitter(ms, n + i) })),
  };
  const r = await fetch(`${URL}/rest/v1/rpc/sync_usage`, {
    method: 'POST', headers: { apikey: PUB, Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });
  if (r.ok) sent++; else console.log(day, r.status, await r.text());
}
console.log(`días de demostración cargados: ${sent}`);
void H;
