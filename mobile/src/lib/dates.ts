/** Fechas en hora local con desfase explícito (p. ej. 2026-11-12T15:30:00-06:00). */
const pad = (n: number) => String(n).padStart(2, '0');

export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoWithOffset(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function timeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City';
}

export function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)} s`;
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}
