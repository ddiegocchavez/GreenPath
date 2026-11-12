# Contrato de sincronización v1

Fuente de verdad: [`shared/contrato/sync-v1.schema.json`](../../shared/contrato/sync-v1.schema.json).

## Petición

`POST /functions/v1/sync` · `Authorization: Bearer <JWT del usuario>`

```json
{
  "schema_version": 1,
  "device_id": "3f1c2a4e-8b7d-4c11-9a0e-2d5f6b7c8d9e",
  "device_label": "Pixel 6 (emulador)",
  "timezone": "America/Mexico_City",
  "local_date": "2026-11-12",
  "period_start": "2026-11-12T00:00:00-06:00",
  "period_end": "2026-11-12T14:30:00-06:00",
  "observed_at": "2026-11-12T14:30:05-06:00",
  "source": "android_usagestats",
  "items": [
    { "app_id": "com.whatsapp", "app_label": "WhatsApp", "foreground_ms": 1834000 }
  ]
}
```

## Reglas

1. **Usuario:** sale del JWT validado; nunca del cuerpo.
2. **Unidad:** `foreground_ms` en milisegundos, entero entre 0 y 86 400 000.
3. **Clave:** `(user_id, device_id, local_date, app_id)`.
4. **Reemplazo, no suma:** cada envío es la foto acumulada del día.
5. **Lo antiguo no pisa lo nuevo:** se actualiza solo si `observed_at` es mayor que el guardado.
6. **Por dispositivo:** no se suman dispositivos como tiempo exclusivo de una persona.
7. **Demo:** `is_demo = true` en datos de demostración; la interfaz los etiqueta.
8. **Versionado:** cualquier cambio incompatible sube `schema_version`.

## Respuesta (propuesta)

```json
{
  "ok": true,
  "local_date": "2026-11-12",
  "apps_saved": 12,
  "ignored_as_older": 0,
  "estimate": { "status": "pending", "reason": "sin factor defendible para minutos de uso", "model_version": "0.1.0" }
}
```

`estimate.status`: `estimated` (con `kg_co2e`, factor y fuente) · `pending` (con motivo).
