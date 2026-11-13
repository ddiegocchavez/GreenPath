# supabase/ — Base de datos

Proyecto `greenpath` (ref `hrhojmruqjwpyfqalepx`, us-east-1).

## Migraciones
| Archivo | Qué hace |
|---|---|
| `20261113033513_catalogo.sql` | Vacía a propósito (se aplicó vacía por error). No borrar. |
| `20261113033543_catalogo_tablas.sql` | `tiendas`, `sucursales`, `productos`, `ofertas`: catálogo público de solo lectura. |
| `20261113034630_datos_catalogo.sql` | Datos del 12-nov (generados por `data/generar-seed.mjs`). |
| `20261113073819_datos_catalogo_v2.sql` | Catálogo ampliado: 39 productos y 253 ofertas. |
| `20261113083627_usuarios_planes_creditos.sql` | Perfiles (encuesta), planes, optimizaciones, créditos (libro mayor idempotente) y revisiones, con RLS por usuario y funciones del servidor. |

## Cuentas y datos personales
- Las cuentas son **anónimas** (`enable_anonymous_sign_ins = true` en `config.toml`, aplicado con `supabase config push`). No se piden correo, contraseña ni datos de pago.
- **Qué se guarda por usuario:**
  - Las respuestas de la encuesta.
  - Las optimizaciones guardadas: la lista y los totales.
  - Los movimientos de créditos y las revisiones del periodo.
- **Acceso:** solo el dueño ve sus datos (RLS). Se pueden editar desde la app, y `borrar_mis_datos()` los elimina todos.
- **El ticket** se lee en el teléfono y la foto nunca se sube.
- **Plan y créditos:** solo cambian mediante funciones del servidor (`cambiar_plan_demo`, `guardar_optimizacion`, `evaluar_compensacion`). Plus es **modo demostración**, sin cobros.

## Aplicar
```bash
SUPABASE_DB_PASSWORD=... npx supabase db push --remote
```

## Prueba E2E
`cd app && node ../supabase/tests/planes_e2e.mjs` (usa `app/.env.local`). Son 18 verificaciones: plan demo, créditos, doble cobro, compensación, RLS entre usuarios y borrado.
