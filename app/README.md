# app/ — Web móvil (Next.js)

Toda la experiencia de GreenPath. Corre en el navegador del teléfono y está publicada en Vercel (se actualiza con cada push a `main`).

| Carpeta | Qué hace |
|---|---|
| `src/app/` | Página única con el flujo por pasos (`page.tsx`), estilos y layout. |
| `src/components/` | Piezas visuales (`ui.tsx`), pasos de despensa (`pasos/`), encuesta y propuesta (`onboarding/`) y `MiValor.tsx`. |
| `src/lib/` | Lógica sin interfaz: catálogo, cuenta y créditos, algoritmo, perfil y plan, lector de ticket y distancias. |
| `tests/` | Pruebas del algoritmo, del lector de ticket (con ticket real) y del perfil y plan. |

```bash
cp .env.example .env.local   # URL y llave pública (publishable) de Supabase
npm install
npm run dev                  # http://localhost:3000
npm test                     # pruebas unitarias
node ../supabase/tests/planes_e2e.mjs   # prueba E2E contra Supabase
```
