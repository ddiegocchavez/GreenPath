/** Tipos del catálogo (tablas de Supabase) y del flujo. */
export type TiendaId = 'walmart' | 'heb' | 'costco';
export type Unidad = 'pza' | 'kg' | 'l';

export type Tienda = {
  id: TiendaId; nombre: string; sitio_web: string; requiere_membresia: boolean; nota_precios: string | null;
};
export type Sucursal = { id: number; tienda_id: TiendaId; nombre: string; lat: number; lng: number };
export type Producto = {
  id: string; nombre: string; categoria: string; unidad: Unidad; sinonimos: string[];
  huella_kgco2e: number | null; huella_fuente: string | null;
};
export type Oferta = {
  id: number; producto_id: string; tienda_id: TiendaId; titulo: string; marca: string | null;
  marca_propia: boolean; cantidad: number; precio: number; precio_unitario: number;
  calidad: 1 | 2 | 3 | 4; calidad_motivo: string; sustentabilidad: 1 | 2 | 3 | 4; sustentabilidad_motivo: string;
  url: string; consultado_el: string;
};
export type Catalogo = { tiendas: Tienda[]; sucursales: Sucursal[]; productos: Producto[]; ofertas: Oferta[] };

/** Un renglón de la despensa del usuario. `cantidad` va en la unidad del producto. */
export type Item = { productoId: string; cantidad: number; precioTicket?: number; textoTicket?: string };
export type Prioridad = 'precio' | 'calidad' | 'sustentabilidad';
export type Punto = { lat: number; lng: number; etiqueta: string };
