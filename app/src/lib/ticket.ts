/**
 * Lectura de ticket: OCR gratis en el navegador (Tesseract.js, español) y
 * emparejamiento de cada renglón con un producto del catálogo por sus sinónimos.
 * La foto nunca sale del teléfono.
 */
import type { Producto } from './tipos';

export type RenglonTicket = { texto: string; productoId: string | null; precio: number | null };

export const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.,$ ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Busca el producto cuyo sinónimo aparece en el texto (gana el sinónimo más largo). */
export function emparejarProducto(texto: string, productos: Producto[]): string | null {
  const t = ` ${normalizar(texto)} `;
  let mejor: { id: string; largo: number } | null = null;
  for (const p of productos) {
    for (const s of p.sinonimos) {
      const n = normalizar(s);
      if (n.length >= 3 && t.includes(` ${n}`) && (!mejor || n.length > mejor.largo)) mejor = { id: p.id, largo: n.length };
    }
  }
  return mejor?.id ?? null;
}

/** Último importe con centavos en el renglón (p. ej. "45.00", "$ 32,50"). */
export function extraerPrecio(texto: string): number | null {
  const ms = [...texto.matchAll(/\$?\s?(\d{1,4})[.,](\d{2})(?!\d)/g)];
  if (!ms.length) return null;
  const m = ms[ms.length - 1];
  return Number(`${m[1]}.${m[2]}`);
}

/** Presentación escrita en el renglón ("18PZ", "900G", "1KG", "946ML", "16R"), en la unidad del producto. */
export function extraerCantidad(texto: string, unidad: Producto['unidad']): number | null {
  const t = normalizar(texto);
  const m = (re: RegExp) => { const x = t.match(re); return x ? Number(x[1].replace(',', '.')) : null; };
  if (unidad === 'pza') return m(/(\d{1,3}) ?(?:pz|pza|pzas|piezas|r|rollos)\b/);
  if (unidad === 'kg') {
    const kg = m(/(\d+(?:[.,]\d+)?) ?kg\b/); if (kg) return kg;
    const g = m(/(\d{2,4}) ?(?:g|gr|grs)\b/); return g ? g / 1000 : null;
  }
  const l = m(/(\d+(?:[.,]\d+)?) ?(?:l|lt|lts|litro|litros)\b/); if (l) return l;
  const ml = m(/(\d{2,4}) ?ml\b/); return ml ? ml / 1000 : null;
}

const RUIDO = /total|subtotal|iva|cambio|efectivo|tarjeta|pago|articulos|gracias|rfc|ticket|folio|caja|fecha/i;

export function analizarTexto(texto: string, productos: Producto[]): RenglonTicket[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3 && !RUIDO.test(normalizar(l)))
    .map((l) => ({ texto: l, productoId: emparejarProducto(l, productos), precio: extraerPrecio(l) }))
    .filter((r) => r.productoId || r.precio != null);
}

/** Total impreso en el ticket, si se encuentra. */
export function extraerTotal(texto: string): number | null {
  const l = texto.split(/\r?\n/).find((x) => /^\s*total\b/i.test(normalizar(x)));
  return l ? extraerPrecio(l) : null;
}

export async function leerTicket(imagen: File, alAvanzar?: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('spa', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') alAvanzar?.(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(imagen);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
