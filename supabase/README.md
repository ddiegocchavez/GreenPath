# supabase/ — Base de datos

Proyecto `greenpath` (ref `hrhojmruqjwpyfqalepx`, us-east-1).

## Migraciones
- `20261113033513_catalogo.sql` — vacía a propósito: se aplicó vacía por error. No borrarla.
- `20261113033543_catalogo_tablas.sql` — tablas `tiendas`, `sucursales`, `productos` y `ofertas`. La tabla `ofertas` lleva precio, precio unitario, P1–P4, S1–S4, link y fecha. Tiene RLS de solo lectura pública.
- `20261113034630_datos_catalogo.sql` — datos generados por `data/generar-seed.mjs`.

## Datos personales
No guardamos datos personales: el nombre, la lista y el ticket se quedan en el teléfono.

## Aplicar
```bash
SUPABASE_DB_PASSWORD=... npx supabase db push --remote
```
