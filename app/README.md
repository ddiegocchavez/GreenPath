# app/ — Web móvil (Next.js)

Toda la experiencia de GreenPath. Corre en el navegador del teléfono.

| Carpeta | Qué hace |
|---|---|
| `src/app/` | Página única con el flujo por pasos (`page.tsx`), estilos y layout. |
| `src/components/` | Piezas visuales (`ui.tsx`) y un archivo por grupo de pasos (`pasos/`). |
| `src/lib/` | Lógica sin interfaz: catálogo (Supabase), algoritmo (`optimizar.ts`), lector de ticket (`ticket.ts`), distancias (`geo.ts`). |
| `tests/` | Pruebas del algoritmo y del lector de ticket. |

```bash
cp .env.example .env.local   # URL y llave pública de Supabase
npm install
npm run dev                  # http://localhost:3000
npm test                     # pruebas
```
