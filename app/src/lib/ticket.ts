/**
 * Lectura de ticket: OCR gratis en el navegador (Tesseract.js, español) y emparejamiento
 * de cada renglón con un producto del catálogo. La foto nunca sale del teléfono.
 *
 * El emparejamiento "aprende" de dos fuentes:
 *  1. El catálogo: cada título capturado ("Santa Clara Leche Deslactosada 1 L") es un ejemplo
 *     de cómo se nombra un producto. Las palabras raras pesan más (una marca como "Oatly"
 *     identifica el producto; "blanca" casi no). Las abreviaturas de ticket ("CLA", "VEG",
 *     "DESLACTOSAD") se reconocen como prefijos.
 *  2. Las correcciones del usuario: si en la revisión elige otro producto para un renglón,
 *     se guarda y la próxima vez ese texto se reconoce directo.
 */
import type { Oferta, Producto } from './tipos';

export type RenglonTicket = {
  texto: string; productoId: string | null; precio: number | null; unidades: number; confianza: number;
};
export type Aprendidas = Record<string, string>; // texto normalizado → productoId

export const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.,$ ]/g, ' ').replace(/\s+/g, ' ').trim();

const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'en', 'para', 'por', 'y', 'c/u', 'cu', 'pack', 'caja', 'bolsa',
  'pz', 'pza', 'pzas', 'piezas', 'kg', 'gr', 'grs', 'ml', 'lt', 'lts', 'litro', 'litros', 'rollos', 'tipo', 'sabor', 'original', 'clasico', 'regular']);

/** Palabras útiles de un texto: sin números, unidades ni palabras vacías. */
export function palabras(s: string): string[] {
  return normalizar(s).replace(/[.,$]/g, ' ').split(' ').filter((w) => w.length >= 3 && !/\d/.test(w) && !VACIAS.has(w));
}

/** Clave para recordar correcciones: el renglón sin números ni precios. */
export const claveRenglon = (texto: string) => palabras(texto).join(' ');

export type Indice = {
  /** palabra → productos donde aparece (y si es marca) */
  vocab: Map<string, { productos: Set<string>; marca: boolean }>;
  nProductos: number;
  sinonimos: { id: string; frase: string }[];
  aprendidas: Aprendidas;
};

export function construirIndice(productos: Producto[], ofertas: Oferta[], aprendidas: Aprendidas = {}): Indice {
  const vocab: Indice['vocab'] = new Map();
  const agregar = (w: string, id: string, marca = false) => {
    const e = vocab.get(w) ?? { productos: new Set<string>(), marca: false };
    e.productos.add(id); e.marca ||= marca; vocab.set(w, e);
  };
  for (const p of productos) {
    for (const w of palabras(p.nombre)) agregar(w, p.id);
    for (const s of p.sinonimos) for (const w of palabras(s)) agregar(w, p.id);
  }
  for (const o of ofertas) {
    for (const w of palabras(o.titulo)) agregar(w, o.producto_id);
    if (o.marca) for (const w of palabras(o.marca)) agregar(w, o.producto_id, true);
  }
  const sinonimos = productos.flatMap((p) => p.sinonimos.map((s) => ({ id: p.id, frase: normalizar(s) })))
    .filter((s) => s.frase.length >= 3);
  return { vocab, nProductos: productos.length, sinonimos, aprendidas };
}

/** Puntaje de cada producto para un renglón; regresa el mejor y su confianza (0–1). */
export function emparejar(texto: string, ix: Indice): { id: string | null; confianza: number } {
  const clave = claveRenglon(texto);
  if (clave && ix.aprendidas[clave]) return { id: ix.aprendidas[clave], confianza: 1 };

  const puntos = new Map<string, number>();
  const sumar = (id: string, v: number) => puntos.set(id, (puntos.get(id) ?? 0) + v);
  const peso = (df: number) => Math.log(1 + ix.nProductos / df);

  for (const w of new Set(palabras(texto))) {
    // Mejor coincidencia de esta palabra para cada producto (exacta, o abreviatura = prefijo).
    const mejorPorProducto = new Map<string, number>();
    for (const [k, e] of ix.vocab) {
      let f = 0;
      if (k === w) f = 1;
      else if (k.startsWith(w) && w.length >= 3) f = 0.75;                 // "cla" → "clara", "veg" → "vegetal"
      else if (w.startsWith(k) && k.length >= 5) f = 0.75;                  // "deslactosada" ↔ "deslactosad"
      else if (w.length >= 6 && k.length >= 6 && casiIgual(w, k)) f = 0.6;  // OCR: "consone" ≈ "consome", "natual" ≈ "natural"
      if (!f) continue;
      const v = f * peso(e.productos.size) * (e.marca ? 1.5 : 1);
      for (const id of e.productos) mejorPorProducto.set(id, Math.max(mejorPorProducto.get(id) ?? 0, v));
    }
    for (const [id, v] of mejorPorProducto) sumar(id, v);
  }
  // Frases de sinónimos completas ("leche veg", "carne molida") suman extra.
  const t = ` ${normalizar(texto)} `;
  for (const s of ix.sinonimos) if (t.includes(` ${s.frase} `)) sumar(s.id, 1 + s.frase.split(' ').length);

  const orden = [...puntos.entries()].sort((a, b) => b[1] - a[1]);
  if (!orden.length || orden[0][1] < 1.2) return { id: null, confianza: 0 };
  const [mejor, segundo] = [orden[0][1], orden[1]?.[1] ?? 0];
  return { id: orden[0][0], confianza: Math.min(1, (mejor - segundo) / mejor + 0.2) };
}

/** Compatibilidad: emparejar con solo productos (sin catálogo de ofertas). */
export function emparejarProducto(texto: string, productos: Producto[]): string | null {
  return emparejar(texto, construirIndice(productos, [])).id;
}

/** Último importe con centavos en el renglón (p. ej. "45.00", "$ 32,50"). */
export function extraerPrecio(texto: string): number | null {
  const ms = [...texto.matchAll(/\$?\s?(\d{1,4})[.,](\d{2})(?!\d)/g)];
  if (!ms.length) return null;
  const m = ms[ms.length - 1];
  return Number(`${m[1]}.${m[2]}`);
}

/**
 * Columnas CANT · PRE.UNIT · TOTAL ("3 59.90 179.70"). Tolera lo que hace el OCR:
 * basura después del total, un decimal perdido ("69.9", "33.9)") y la cantidad pegada al precio
 * ("815,50 124.00" = 8 × 15.50; "199.90 99.90" = 1 × 99.90). Solo acepta si cantidad × unitario ≈ total.
 */
export function extraerColumnas(texto: string): { unidades: number; unitario: number; total: number } | null {
  const nums = [...texto.matchAll(/(\d{1,6})[.,](\d{1,2})(?!\d)/g)].map((m) => ({
    txt: m[1], valor: Number(`${m[1]}.${m[2].padEnd(2, '0')}`), i: m.index!,
  }));
  if (nums.length < 2) return null;
  const [a, b] = nums.slice(-2);
  const total = b.valor;
  const cuadra = (q: number, u: number) => q >= 1 && q <= 50 && Math.abs(q * u - total) <= Math.max(1, total * 0.05);
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const antes = texto.slice(0, a.i).match(/(?:^|\s)(\d{1,2})\s+$/);
  if (antes && cuadra(Number(antes[1]), a.valor)) return { unidades: Number(antes[1]), unitario: a.valor, total };
  // Cantidad pegada al unitario: separar 1 o 2 dígitos del inicio.
  for (const k of [1, 2]) {
    if (a.txt.length <= k) continue;
    const q = Number(a.txt.slice(0, k));
    const u = r2(a.valor - q * 10 ** (a.txt.length - k));
    if (u > 0 && cuadra(q, u)) return { unidades: q, unitario: u, total };
  }
  if (cuadra(1, a.valor)) return { unidades: 1, unitario: a.valor, total };
  return null;
}

/** Distancia de edición ≤ 1 (una letra cambiada, de más o de menos). */
function casiIgual(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, dif = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++dif > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return dif + (a.length - i) + (b.length - j) <= 1;
}

/** Presentación escrita en el renglón ("18PZ", "900G", "750GR", "946ML", "6s"), en la unidad del producto. */
export function extraerCantidad(texto: string, unidad: Producto['unidad']): number | null {
  // El OCR suele leer "GR" como "6R" ("7506R" = "750GR").
  const t = normalizar(texto).replace(/(\d{2,4})6r\b/g, '$1gr');
  const m = (re: RegExp) => { const x = t.match(re); return x ? Number(x[1].replace(',', '.')) : null; };
  if (unidad === 'pza') return m(/(\d{1,3}) ?(?:pz|pza|pzas|piezas|r|rollos|s)\b/);
  if (unidad === 'kg') {
    const kg = m(/(\d+(?:[.,]\d+)?) ?kg\b/); if (kg) return kg;
    const g = m(/(\d{2,4}) ?(?:g|gr|grs)\b/); return g ? g / 1000 : null;
  }
  const l = m(/(\d+(?:[.,]\d+)?) ?(?:l|lt|lts|litro|litros)\b/); if (l) return l;
  const ml = m(/(\d{2,4}) ?ml\b/); return ml ? ml / 1000 : null;
}

// Renglones que no son artículos (encabezados, impuestos, pago). Incluye lecturas típicas del OCR ("TUA16%" = "IVA16%").
const RUIDO = new RegExp([
  'total', 'subtotal', 'iva', '\\b[it1l][o0u]a\\s?1?\\d\\s?%', 'venta', 'cambio', 'efectivo', 'tarjeta', 'pago', 'articulo', 'gracias', 'rfc',
  'ticket', 'folio', 'caja', 'fecha', 'cuenta', 'autoriza', 'comentar', 'precios', 'prosa', 'visa', 'master', 'banamex', 'bbva', 'santander',
  'ahorr', 'rebajad', 'promocion', 'factur', 'solicite', 'cajero', 'atendio', 'supermercados', 'sucursal',
].join('|'), 'i');

export function analizarTexto(texto: string, ix: Indice | Producto[]): RenglonTicket[] {
  const indice = Array.isArray(ix) ? construirIndice(ix, []) : ix;
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3 && !RUIDO.test(normalizar(l)))
    .map((l) => {
      const { id, confianza } = emparejar(l, indice);
      const col = extraerColumnas(l);
      return { texto: l, productoId: id, precio: col?.total ?? extraerPrecio(l), unidades: col?.unidades ?? 1, confianza };
    })
    // Un artículo de ticket siempre trae importe: sin precio es encabezado o basura del OCR.
    // Sin producto, solo se pregunta al usuario si tiene precio y alguna palabra (no "$43.10" suelto).
    .filter((r) => r.precio != null && (r.productoId || palabras(r.texto).length > 0));
}

/** Total impreso en el ticket ("TOTAL", "***Venta Total"), sin confundir con subtotal. */
export function extraerTotal(texto: string): number | null {
  const ls = texto.split(/\r?\n/).filter((x) => /\btotal\b/.test(normalizar(x)) && !/subtotal/.test(normalizar(x)));
  for (const l of ls.reverse()) { const p = extraerPrecio(l); if (p != null) return p; }
  return null;
}

// ---- Correcciones del usuario (en este teléfono) ----
const LLAVE = 'greenpath.aprendidas.v1';
export function leerAprendidas(): Aprendidas {
  try { return JSON.parse(localStorage.getItem(LLAVE) ?? '{}'); } catch { return {}; }
}
export function aprender(texto: string, productoId: string) {
  const clave = claveRenglon(texto);
  if (!clave) return;
  try { localStorage.setItem(LLAVE, JSON.stringify({ ...leerAprendidas(), [clave]: productoId })); } catch { /* sin almacenamiento */ }
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
