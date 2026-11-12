# sync/

Envía el resumen diario a la Edge Function `sync` y guarda en SQLite los envíos pendientes cuando no hay red. Cada envío reemplaza el anterior del día; nunca se suma.
