/** Distancias y sucursal más cercana. */
import type { Punto, Sucursal, TiendaId } from './tipos';

export const CENTRO_MTY: Punto = { lat: 25.6714, lng: -100.3090, etiqueta: 'Centro de Monterrey' };

export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function masCercana(sucursales: Sucursal[], tienda: TiendaId, desde: Punto) {
  let mejor: { sucursal: Sucursal; km: number } | null = null;
  for (const s of sucursales) {
    if (s.tienda_id !== tienda) continue;
    const km = distanciaKm(desde, s);
    if (!mejor || km < mejor.km) mejor = { sucursal: s, km };
  }
  return mejor;
}

export const mapsUrl = (s: { lat: number; lng: number }) => `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
