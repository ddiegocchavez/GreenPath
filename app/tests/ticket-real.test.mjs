// Tickets reales como casos de prueba: el lector debe reconocer cada renglón con el catálogo capturado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analizarTexto, construirIndice, extraerTotal, extraerColumnas, emparejar } from '../src/lib/ticket.ts';
import { productos as filasProductos } from '../../data/productos.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'capturas');
const productos = filasProductos.map(([id, nombre, categoria, unidad, sinonimos]) => ({ id, nombre, categoria, unidad, sinonimos }));
const ofertas = readdirSync(raiz).filter((f) => f.endsWith('.tsv')).flatMap((f) =>
  readFileSync(join(raiz, f), 'utf8').trim().split(/\r?\n/).slice(1).map((l) => {
    const [producto_id, tienda_id, titulo, marca] = l.split('\t');
    return { producto_id, tienda_id, titulo, marca: marca || null };
  }));
const ix = construirIndice(productos, ofertas);

// H-E-B Autocobro, 08-05-26 (foto de Diego). Texto tal como viene impreso.
const HEB = `AUTO COBRO H-E-B
Gracias por sus comentarios:
comentarios@hebmex.com
000000 08-05-26 2:58P 000/00/00000
ARTICULO CANT. PRE.UNIT TOTAL
cottonelle 6s 1 99.99 99.99
LECHE VEG AVENA OATLY 3 59.90 179.70
SANTA CLA UHT DESLACTOSAD 2 34.90 69.80
MOLIDA PULPA NEGRA MOLIDA 1 164.00 164.00
MISSION MAIZ BLANCA 750GR 1 35.90 35.90
Oxiclean Multiusos 620gr 1 179.00 179.00
ARTICULOS COMPRADOS: 9 Venta Subtotal 665.12
IVA16% 63.27
***Venta Total 728.39
No. Cuenta:************XXXX
Num.Autorizacion:XXXXXX 728.39
CB PROSA`;

test('ticket H-E-B: reconoce los 6 artículos', () => {
  const r = analizarTexto(HEB, ix).filter((x) => x.productoId);
  assert.deepEqual(r.map((x) => x.productoId), ['papel', 'leche_vegetal', 'leche', 'res', 'tortilla', 'quitamanchas']);
  assert.deepEqual(r.map((x) => x.unidades), [1, 3, 2, 1, 1, 1]);
  assert.deepEqual(r.map((x) => x.precio), [99.99, 179.7, 69.8, 164, 35.9, 179]);
});

// Mismo ticket, salida REAL de Tesseract (spa) sobre la foto. Datos de cuenta/autorización removidos.
const HEB_OCR = `Qracias por SUS comentarios:
comentar iosGhebnex.con
000000 08-05-26 2:58P 000/00/00000
ARTICULO CANT. PRE.UNIT TOTAL |
cottonelle 65 1 99,99 99,99
LECHE VEG AVENA OATLY 3 59,90 179.70
SANTA CLA UNT DESLACTOSAD 2 34,90 69,80
MOLIDA PULPA NEGRA MOLIDA 1 164.00 164.00
MISSION MAIZ BLANCA 7506R 1 35.90 35,90
Oxiclean Multiusos 62097 1 179.00 179.00
ARTICULOS COMPRADOS: Y Venta Subtotal 665,12
TUA16% 63,27
xexVenta Total 728,39
CB PROSA 728.39`;

test('ticket H-E-B con OCR real: mismos 6 artículos, sin basura', () => {
  const r = analizarTexto(HEB_OCR, ix);
  assert.deepEqual(r.filter((x) => x.productoId).map((x) => x.productoId), ['papel', 'leche_vegetal', 'leche', 'res', 'tortilla', 'quitamanchas']);
  assert.deepEqual(r.filter((x) => x.productoId).map((x) => x.precio), [99.99, 179.7, 69.8, 164, 35.9, 179]);
  assert.equal(r.filter((x) => !x.productoId).length, 0, r.filter((x) => !x.productoId).map((x) => x.texto).join(' | '));
  assert.equal(extraerTotal(HEB_OCR), 728.39);
});

test('ticket H-E-B: total y columnas', () => {
  assert.equal(extraerTotal(HEB), 728.39);
  assert.deepEqual(extraerColumnas('LECHE VEG AVENA OATLY 3 59.90 179.70'), { unidades: 3, unitario: 59.9, total: 179.7 });
  assert.equal(extraerColumnas('LECHE 3 59.90 999.70'), null); // no cuadra → no se usa
});

test('abreviaturas y marcas típicas de ticket', () => {
  const casos = {
    'HUEVO SAN JUAN 18PZ': 'huevo', 'FRIJOL PINTO VV 900G': 'frijol', 'TORTILLINAS TIA ROSA': 'tortilla_harina',
    'MAYO MCCORMICK 390G': 'mayonesa', 'SALCH PAVO SAN RAFAEL': 'salchicha', 'JAMON PAVO ZWAN': 'jamon',
    'CLORALEX 950ML': 'cloro', 'AXION LIMON 1.1L': 'lavatrastes', 'MANTEQUILLA LALA S/SAL': 'mantequilla',
    'KNORR SUIZA POLLO': 'consome', 'PAPEL HIG PETALO 16R': 'papel', 'NESCAFE CLASICO 60G': 'cafe',
  };
  for (const [texto, esperado] of Object.entries(casos)) assert.equal(emparejar(texto, ix).id, esperado, texto);
});

test('correcciones del usuario ganan', () => {
  const ix2 = construirIndice(productos, ofertas, { 'molida pulpa negra molida': 'pollo' });
  assert.equal(emparejar('MOLIDA PULPA NEGRA MOLIDA 1 164.00 164.00', ix2).id, 'pollo');
});
