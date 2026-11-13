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
- `20261113073819_datos_catalogo_v2.sql` — catálogo ampliado (39 productos, 253 ofertas).
- `20261113083627_usuarios_planes_creditos.sql` — perfiles (encuesta), planes, optimizaciones, créditos (libro mayor idempotente), revisiones; RLS por usuario y funciones del servidor.

## Cuentas
Cuentas **anónimas** de Supabase (`enable_anonymous_sign_ins = true` en `config.toml`, aplicado con `supabase config push`). Sin correo ni contraseña.

## Prueba E2E
`cd app && node ../supabase/tests/planes_e2e.mjs` (necesita `app/.env.local`; ajusta la ruta del .env si lo corres desde otra carpeta). 18 verificaciones: plan demo, créditos, doble cobro, compensación, RLS y borrado.
