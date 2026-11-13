-- GreenPath · catálogo de precios (solo lectura pública).
-- Los datos personales (nombre, lista, ticket) NO se guardan aquí: viven en el navegador.

create table public.tiendas (
  id                   text primary key,               -- 'walmart' | 'heb' | 'costco'
  nombre               text not null,
  sitio_web            text not null,
  requiere_membresia   boolean not null default false,
  nota_precios         text                             -- p. ej. sucursal usada para el precio en línea
);

create table public.sucursales (
  id          bigint generated always as identity primary key,
  tienda_id   text not null references public.tiendas(id),
  nombre      text not null,
  direccion   text,
  municipio   text,
  estado      text not null default 'Nuevo León',
  lat         double precision not null,
  lng         double precision not null,
  fuente      text not null default 'OpenStreetMap (ODbL)',
  osm_id      text unique
);
create index sucursales_tienda_idx on public.sucursales (tienda_id);

create table public.productos (
  id             text primary key,                      -- slug genérico: 'huevo', 'leche'
  nombre         text not null,
  categoria      text not null,
  unidad         text not null check (unidad in ('pza','kg','l')),
  sinonimos      text[] not null default '{}',          -- para lista escrita y OCR del ticket
  huella_kgco2e  numeric,                               -- kg CO2e por kg de alimento (null = sin factor)
  huella_fuente  text,
  check (huella_kgco2e is null or huella_fuente is not null)
);

create table public.ofertas (
  id                      bigint generated always as identity primary key,
  producto_id             text not null references public.productos(id),
  tienda_id               text not null references public.tiendas(id),
  titulo                  text not null,                -- tal como aparece en la tienda
  marca                   text,
  marca_propia            boolean not null default false,
  cantidad                numeric not null check (cantidad > 0),  -- en la unidad del producto
  precio                  numeric(10,2) not null check (precio > 0),
  precio_unitario         numeric(12,4) generated always as (precio / cantidad) stored,
  calidad                 smallint not null check (calidad between 1 and 4),        -- P1..P4
  calidad_motivo          text not null,
  sustentabilidad         smallint not null check (sustentabilidad between 1 and 4), -- S1..S4
  sustentabilidad_motivo  text not null,
  url                     text not null,
  consultado_el           date not null
);
create index ofertas_producto_idx on public.ofertas (producto_id);
create index ofertas_tienda_idx on public.ofertas (tienda_id);

-- Catálogo público de solo lectura.
alter table public.tiendas    enable row level security;
alter table public.sucursales enable row level security;
alter table public.productos  enable row level security;
alter table public.ofertas    enable row level security;

create policy "lectura publica" on public.tiendas    for select to anon, authenticated using (true);
create policy "lectura publica" on public.sucursales for select to anon, authenticated using (true);
create policy "lectura publica" on public.productos  for select to anon, authenticated using (true);
create policy "lectura publica" on public.ofertas    for select to anon, authenticated using (true);

revoke all on public.tiendas, public.sucursales, public.productos, public.ofertas from anon, authenticated;
grant select on public.tiendas, public.sucursales, public.productos, public.ofertas to anon, authenticated;
