# tests/

Pruebas SQL que demuestran: una cuenta no lee a otra, repetir un envÃ­o no duplica y un envÃ­o antiguo no sobrescribe uno reciente.

## Cómo correr `sync_e2e.mjs`

Crea dos usuarios de prueba, verifica idempotencia, que lo antiguo no sobrescribe y el aislamiento por RLS, y los borra al final.

```powershell
$k = npx supabase projects api-keys --project-ref fmjjcdflnmbytznryefg --reveal -o json | ConvertFrom-Json
$env:SB_URL = 'https://fmjjcdflnmbytznryefg.supabase.co'
$env:SB_PUB = ($k | ? type -eq 'publishable').api_key
$env:SB_SECRET = ($k | ? type -eq 'secret').api_key
node supabase/tests/sync_e2e.mjs
```
