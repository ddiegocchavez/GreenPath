# mobile/

App Android de GreenPath (Expo + React Native + TypeScript).

| Ruta | Qué contiene |
|---|---|
| `index.ts` | Punto de entrada; registra `src/App.tsx` |
| `src/` | Todo el código de la app |
| `assets/` | Imágenes, fuentes e ilustraciones |
| `android/` | Proyecto nativo generado por `expo prebuild` (no se versiona) |

```bash
npm install
npx expo run:android
```

Requiere compilación propia: Expo Go no carga el módulo de estadísticas de uso.
