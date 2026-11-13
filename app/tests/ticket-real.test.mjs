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

// Ticket H-E-B #2 (foto de Diego en el carrito, 15 artículos). Salida REAL de Tesseract, con basura
// a los lados, columnas pegadas ("815,50" = 8 × 15.50) y letras confundidas ("CONSONE", "Natual", "T0A16%").
// Datos de cuenta, autorización y dirección removidos.
const HEB2_OCR = `; ARTICULO CANT. -PRE.UNIT TOTAL b
BOLSA BASURA HED 4077 1 69,90 69.9 — 6
. MISSION MAIZ BLANCA 7500R 133,90 33.9) us
FRESA 1 LB 1 69,95 69.95 !
y: Chobani Natual 9079r 1 144,90 144.90 3 En |
TIA OFILIA MIEL DE ABEJA 190.9) 90.90 , |
y SALMAS NATURALES 1 72,50 7250 E 1
a SLECC ALLENDE HUEV BCO 30 199.90 99.90 E e
- h QUESO MANCHEGO RALLADO 1 129,00 129.00 HH” EL
N LECHE UNT DESLACTOSADA 1 2 49,90 99.60 E —*
i Pechuga de Pavo SRF 2509 1 92.90 92.90 f El y!
| ¡ NEB BLUEBERRY 1 69,95 69,95 í : Fo
E TOMATISIMO CONSONE DE POL 1 17,50 17.50 LU
j LALA QUESO COTTAGE REGULA 1 68.00 68.00 E EM ”
[A AZATUN ATUN AGUA POUCH 815,50 124.00 1% li
. r GLORIA MANTEQUILLA BARRA 1 22,50 22,50 e MEE de
——— A ARTICULOS COMPRADOS: 23 Venta Subtotal — 1195.96 el a
“ ! | T0A16% 9.64 MA E:
xselenta Total 1205.60 p ES
7 MN CB PROSA 1205.60 ! ES
"e - a TO PROMOCIONES APLICADAS ua =£
A : AHORRO Y REBAJADOS. ——: $43.10 NE :
: - 7) HOY AHORRASTE: ng “ON
o "me $43.10 5 ¡ |
E O ia ai coo
Solicite su factura durante el nes de su compra en 317009 y`;

test('ticket H-E-B #2 con OCR real: 15/15 artículos, cantidades y totales, sin basura', () => {
  const r = analizarTexto(HEB2_OCR, ix);
  const ok = r.filter((x) => x.productoId);
  assert.deepEqual(ok.map((x) => x.productoId), ['bolsa_basura', 'tortilla', 'fresa', 'yogurt', 'miel', 'salmas', 'huevo', 'queso_manchego',
    'leche', 'jamon', 'mora_azul', 'consome', 'queso_cottage', 'atun', 'mantequilla']);
  assert.deepEqual(ok.map((x) => x.unidades), [1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 8, 1]);
  assert.deepEqual(ok.map((x) => x.precio), [69.9, 33.9, 69.95, 144.9, 90.9, 72.5, 99.9, 129, 99.6, 92.9, 69.95, 17.5, 68, 124, 22.5]);
  assert.deepEqual(r.filter((x) => !x.productoId).map((x) => x.texto), []);
  assert.equal(extraerTotal(HEB2_OCR), 1205.6);
});

test('columnas pegadas por el OCR', () => {
  assert.deepEqual(extraerColumnas('AZATUN ATUN AGUA POUCH 815,50 124.00 1% li'), { unidades: 8, unitario: 15.5, total: 124 });
  assert.deepEqual(extraerColumnas('SLECC ALLENDE HUEV BCO 30 199.90 99.90 E e'), { unidades: 1, unitario: 99.9, total: 99.9 });
  assert.deepEqual(extraerColumnas('MISSION MAIZ BLANCA 7500R 133,90 33.9) us'), { unidades: 1, unitario: 33.9, total: 33.9 });
  assert.deepEqual(extraerColumnas('LECHE UNT DESLACTOSADA 1 2 49,90 99.60 E'), { unidades: 2, unitario: 49.9, total: 99.6 });
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

// Tickets H-E-B #3 y #4 (fotos de Diego, 13-nov). Salida REAL de Tesseract; datos de cuenta, autorización y folios removidos.
const HEB3_OCR = `COBRO —
a
Aracias por sus comentarios: 68
conentariosGhebnex,con
ARTÍCULO CANT, —PRE.UNIT TOTAL |
AGUACATE EXTRA 1 72.43 72.43
PLATANO 1 25,85 25,85
PEPINO FRESCO 1 29.64 29.64
LIMON ABRIO SUPREMO 1 21.48 21.48
Cobro Estacionaniento 1 3.00 3.00
ARTICULOS COMPRADOS: —5 Venta Subtotal 152.40
Venta Total 152.40 Jubt
CB PROSA 152.40
Cajero:680 Cajero Autocobro H10
Total H.N. 152.40
ooo SOOE Oo
La | |
boo
| .ES
197]
Le Atendio:Cajero Autocobro 10 pan
dao o S
SUP MERCADOS INTERNACIONALES HEB, SA de 99,
La AFC: STH951127977 a _—- uE |

`;
const HEB4_OCR = `AUTO
COBRO
a (1-5) E
gracias por sus conentartos: —_
conentarioshebnex.con
ARTICULO CANT. -—PRE.UNIT TOTAL ES
LIMON ABRIO SUPRENO | anáp. 242 NA
PEPINO FRESCO: 17002 39.09 CS
VGTLS ESPINACA BBY 1250 134.06 34.00 EN u «
HEB TIN MULTIGRAN 1 31.90 31.0 EN é
" HEB CREANY CREA HELADO CO 165.00 65.00 “ANA
y 2499 EN HELADOS HEB CREAN CREATION DE ESO
MLD DULCE DE LECNE 165.00 65.00 y E UN
2)99 EN HELADOS HEB CREANY CREATIONS DE E a Y
| SHAMPOO MENNEN an sn MU PU
sh Nennen 2ent 7001 1 AD ES s 1 e
qON BACARDI BLANCO 700 M. + 206.00 206.0 E D
Dechuga de Pavo SRF 2509 1 81.9 81.90 Y (
E Gunyo eco ENTERO 275 6A CI UN A
qUESO FETA CHUNK 1 g10.00 110.00 __ NU y
GLORTA MANTEQUILLA BARRA (25 20 E L E
LA FINA SAL VODADA FLUORY 93,50 33.50 Ny -
AGUACATE EXTRA ; MOB _ E
Cobro Estacionamiento 1 45.00 15.00 EZ a
h ARTICULOS coNRADOS: 16 vente subtotal -—- 816.57 o —_—
TEPS3% 61,52 /
. > TUI us DA —]
——— auaVenta Total 921.07 ——
— DESCUENTO 31.00 uu
Total despues de Ahorro 890.07 — - — E -
No. cuante:wresovereme:T060 paa o y >
mios A “
— me j ;
. > q N -
21077 , a .
A < + "A
REC *
- > E
2 MA m %
Y é 7 — ro 7
4 8 ( A E MAL
“r
- a ,
La _ b
y S 4
— “ ”

`;

test('ticket H-E-B #3: frutas y verduras, sin el cobro de estacionamiento', () => {
  const r = analizarTexto(HEB3_OCR, ix);
  assert.deepEqual(r.map((x) => [x.productoId, x.precio]), [['aguacate', 72.43], ['platano', 25.85], ['pepino', 29.64], ['limon', 21.48]]);
  assert.equal(extraerTotal(HEB3_OCR), 152.4);
});

test('ticket H-E-B #4 (foto difícil): solo el bloque de artículos; productos sin precio legible se conservan para completarlos', () => {
  const r = analizarTexto(HEB4_OCR, ix);
  assert.deepEqual(r.filter((x) => x.productoId).map((x) => x.productoId), ['limon', 'pepino', 'espinaca', 'galletas_saladas', 'helado',
    'shampoo', 'shampoo', 'ron', 'jamon', 'queso_feta', 'mantequilla', 'sal', 'aguacate']);
  // Sin producto pero con precio: se pregunta al usuario (y aprende de su respuesta).
  assert.deepEqual(r.filter((x) => !x.productoId).map((x) => x.precio), [65]);
  // Nada del encabezado ni del pie (gracias, totales, autorización, dirección).
  assert.ok(!r.some((x) => /gracias|total|autor|mercados/i.test(x.texto)));
  assert.equal(extraerTotal(HEB4_OCR), 890.07); // "Total después de ahorro" es lo que se pagó
});
