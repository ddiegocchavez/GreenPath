/** Cliente de Supabase con la llave pública: el catálogo es de solo lectura (RLS). */
import { createClient } from '@supabase/supabase-js';
import type { Catalogo } from './tipos';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;

// La sesión (cuenta anónima) se guarda en el navegador para conservar perfil, historial y créditos.
export const supabase = url && key ? createClient(url, key) : null;

export async function cargarCatalogo(): Promise<Catalogo> {
  if (!supabase) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_KEY.');
  const [t, s, p, o] = await Promise.all([
    supabase.from('tiendas').select('*'),
    supabase.from('sucursales').select('id, tienda_id, nombre, lat, lng'),
    supabase.from('productos').select('*').order('categoria').order('nombre'),
    supabase.from('ofertas').select('*'),
  ]);
  const err = t.error ?? s.error ?? p.error ?? o.error;
  if (err) throw new Error(err.message);
  return {
    tiendas: t.data!, sucursales: s.data!, productos: p.data!,
    ofertas: o.data!.map((x) => ({ ...x, cantidad: Number(x.cantidad), precio: Number(x.precio), precio_unitario: Number(x.precio_unitario) })),
  };
}
