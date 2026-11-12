-- =============================================================================
-- GreenPath · esquema inicial
-- Separa: actividad registrada · emisiones estimadas · catálogo · elecciones · puntos
-- =============================================================================

create schema if not exists private;

-- -----------------------------------------------------------------------------
-- 1. Perfil y preferencias
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  tone text not null default 'directo' check (tone in ('directo', 'detallado')),
  created_at timestamptz not null default now()
);

create table public.preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  effort text not null default 'moderado' check (effort in ('minimo', 'moderado', 'alto')),
  budget text not null default 'sin_gasto' check (budget in ('sin_gasto', 'bajo', 'medio', 'alto')),
  willing_changes text[] not null default '{}',
  summary_frequency text not null default 'semanal'
    check (summary_frequency in ('diaria', 'semanal', 'quincenal', 'mensual')),
  updated_at timestamptz not null default now()
);

-- Crea perfil y preferencias al registrarse.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. Monitor: actividad registrada (medida, no estimada)
-- -----------------------------------------------------------------------------
create table public.devices (
  id uuid primary key,                 -- generado en el teléfono al instalar
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text check (char_length(label) <= 80),
  created_at timestamptz not null default now()
);
create index devices_user_id_idx on public.devices (user_id);

create table public.usage_daily (
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete cascade,
  local_date date not null,
  app_id text not null check (char_length(app_id) between 1 and 255),
  app_label text check (char_length(app_label) <= 120),
  foreground_ms bigint not null check (foreground_ms between 0 and 86400000),
  timezone text not null,
  period_start timestamptz not null,
  period_end timestamptz not null check (period_end >= period_start),
  observed_at timestamptz not null,
  schema_version smallint not null default 1,
  source text not null default 'android_usagestats',
  is_demo boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id, local_date, app_id)
);
create index usage_daily_device_id_idx on public.usage_daily (device_id);

comment on table public.usage_daily is
  'Foto acumulada del día por dispositivo y app. Se reemplaza (nunca se suma) si observed_at es más reciente.';

-- -----------------------------------------------------------------------------
-- 3. Modelo ambiental: factores con fuente (o pendientes)
-- -----------------------------------------------------------------------------
create table public.emission_factors (
  id text primary key,
  description text not null,
  value numeric,                        -- null cuando está pendiente
  unit text not null,                   -- p. ej. 'kgCO2e/kWh'
  scope text not null,                  -- qué incluye y qué no (evita doble conteo)
  source_title text,
  source_url text,
  assumptions text,
  uncertainty text,
  model_version text not null,
  status text not null default 'pendiente' check (status in ('verificado', 'pendiente')),
  check (status = 'pendiente' or (value is not null and source_url is not null))
);

-- -----------------------------------------------------------------------------
-- 4. Catálogo curado (sin IA): recomendaciones, eventos y productos
-- -----------------------------------------------------------------------------
create table public.events (
  id text primary key,                  -- 'carne_asada', 'fiesta'
  name text not null,
  description text
);

create table public.recommendations (
  id text primary key,
  section text not null check (section in ('reducir_sin_gastar', 'eventos')),
  event_id text references public.events (id),
  title text not null,
  what_to_do text not null,
  why text not null,                    -- por qué podría reducir emisiones
  data_and_assumptions text not null,   -- qué datos y supuestos lo respaldan
  sources jsonb not null default '[]',  -- [{title, url}]
  effort text not null check (effort in ('minimo', 'moderado', 'alto')),
  cost_level text not null check (cost_level in ('sin_gasto', 'bajo', 'medio', 'alto')),
  cost_note text,
  impact_note text not null default 'No cuantificado',
  tags text[] not null default '{}',
  active boolean not null default true
);
create index recommendations_event_id_idx on public.recommendations (event_id);

create table public.products (
  id text primary key,
  name text not null,
  store text not null check (store in ('walmart', 'heb')),
  url text not null,
  category text not null,
  presentation text,                    -- p. ej. '1 kg', '6 piezas'
  price numeric check (price >= 0),
  currency text not null default 'MXN',
  price_checked_at date,                -- fecha en que se consultó el precio
  criterion text not null,              -- criterio ambiental
  info_level text not null check (info_level in ('categoria', 'producto')),
  link_verified_at date,
  check (price is null or price_checked_at is not null)
);

create table public.event_products (
  event_id text not null references public.events (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  primary key (event_id, product_id)
);
create index event_products_product_id_idx on public.event_products (product_id);

-- -----------------------------------------------------------------------------
-- 5. Elecciones y puntos (conceptos distintos de las emisiones)
-- -----------------------------------------------------------------------------
create table public.user_choices (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  recommendation_id text not null references public.recommendations (id),
  status text not null check (status in ('elegida', 'realizada', 'descartada')),
  chosen_at timestamptz not null default now(),
  done_at timestamptz,
  unique (user_id, recommendation_id),
  check (status <> 'realizada' or done_at is not null)
);
create index user_choices_recommendation_id_idx on public.user_choices (recommendation_id);

create table public.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index points_ledger_user_id_idx on public.points_ledger (user_id);

-- -----------------------------------------------------------------------------
-- 6. RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.devices enable row level security;
alter table public.usage_daily enable row level security;
alter table public.emission_factors enable row level security;
alter table public.events enable row level security;
alter table public.recommendations enable row level security;
alter table public.products enable row level security;
alter table public.event_products enable row level security;
alter table public.user_choices enable row level security;
alter table public.points_ledger enable row level security;

-- Catálogo: lectura pública, sin escritura desde clientes.
create policy "catalogo legible" on public.emission_factors for select to anon, authenticated using (true);
create policy "catalogo legible" on public.events for select to anon, authenticated using (true);
create policy "catalogo legible" on public.recommendations for select to anon, authenticated using (active);
create policy "catalogo legible" on public.products for select to anon, authenticated using (true);
create policy "catalogo legible" on public.event_products for select to anon, authenticated using (true);

-- Datos personales: cada usuario solo ve y modifica lo suyo.
create policy "perfil propio" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "perfil propio editar" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "preferencias propias" on public.preferences for select to authenticated using (user_id = (select auth.uid()));
create policy "preferencias propias editar" on public.preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "dispositivos propios" on public.devices for select to authenticated using (user_id = (select auth.uid()));
create policy "dispositivos propios alta" on public.devices for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dispositivos propios editar" on public.devices for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "uso propio" on public.usage_daily for select to authenticated using (user_id = (select auth.uid()));
create policy "uso propio alta" on public.usage_daily for insert to authenticated with check (user_id = (select auth.uid()));
create policy "uso propio editar" on public.usage_daily for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "elecciones propias" on public.user_choices for select to authenticated using (user_id = (select auth.uid()));
create policy "elecciones propias alta" on public.user_choices for insert to authenticated with check (user_id = (select auth.uid()));
create policy "elecciones propias editar" on public.user_choices for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Puntos: solo lectura para el usuario; se otorgan desde funciones del servidor.
create policy "puntos propios" on public.points_ledger for select to authenticated using (user_id = (select auth.uid()));

-- Permisos explícitos (no depender de privilegios por defecto).
revoke all on all tables in schema public from anon, authenticated;
grant select on public.emission_factors, public.events, public.recommendations,
  public.products, public.event_products to anon, authenticated;
grant select, update on public.profiles, public.preferences to authenticated;
grant select, insert, update on public.devices, public.usage_daily, public.user_choices to authenticated;
grant select on public.points_ledger to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Sincronización idempotente del Monitor (contrato v1)
--    Security invoker: corre con los permisos y RLS del usuario autenticado.
-- -----------------------------------------------------------------------------
create or replace function public.sync_usage(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  v_device uuid;
  v_total integer;
  v_saved integer;
begin
  if uid is null then
    raise exception 'sesion requerida' using errcode = '28000';
  end if;
  if (payload ->> 'schema_version')::int is distinct from 1 then
    raise exception 'schema_version no soportada' using errcode = '22023';
  end if;
  if jsonb_typeof(payload -> 'items') <> 'array' then
    raise exception 'items debe ser una lista' using errcode = '22023';
  end if;

  v_device := (payload ->> 'device_id')::uuid;

  -- Registrar dispositivo; si el id pertenece a otra cuenta, no se toca.
  insert into public.devices (id, user_id, label)
  values (v_device, uid, left(payload ->> 'device_label', 80))
  on conflict (id) do update set label = excluded.label
    where public.devices.user_id = uid;

  if not exists (select 1 from public.devices d where d.id = v_device and d.user_id = uid) then
    raise exception 'dispositivo no pertenece a esta cuenta' using errcode = '42501';
  end if;

  v_total := jsonb_array_length(payload -> 'items');

  with incoming as (
    select x.app_id, x.app_label, x.foreground_ms
    from jsonb_to_recordset(payload -> 'items') as x(app_id text, app_label text, foreground_ms bigint)
  ),
  upserted as (
    insert into public.usage_daily as u (
      user_id, device_id, local_date, app_id, app_label, foreground_ms,
      timezone, period_start, period_end, observed_at, schema_version, source, is_demo
    )
    select uid, v_device, (payload ->> 'local_date')::date, i.app_id, left(i.app_label, 120), i.foreground_ms,
           payload ->> 'timezone', (payload ->> 'period_start')::timestamptz,
           (payload ->> 'period_end')::timestamptz, (payload ->> 'observed_at')::timestamptz,
           1, 'android_usagestats', coalesce((payload ->> 'is_demo')::boolean, false)
    from incoming i
    on conflict (user_id, device_id, local_date, app_id) do update set
      app_label = excluded.app_label,
      foreground_ms = excluded.foreground_ms,
      timezone = excluded.timezone,
      period_start = excluded.period_start,
      period_end = excluded.period_end,
      observed_at = excluded.observed_at,
      is_demo = excluded.is_demo,
      updated_at = now()
    where excluded.observed_at > u.observed_at   -- lo antiguo no pisa lo reciente
    returning 1
  )
  select count(*) into v_saved from upserted;

  return jsonb_build_object(
    'ok', true,
    'local_date', payload ->> 'local_date',
    'apps_saved', v_saved,
    'ignored_as_older', v_total - v_saved
  );
end;
$$;

revoke execute on function public.sync_usage(jsonb) from public, anon;
grant execute on function public.sync_usage(jsonb) to authenticated;

-- Resumen diario por dispositivo (no suma dispositivos entre sí).
create view public.v_daily_activity
with (security_invoker = true) as
select user_id, device_id, local_date,
       sum(foreground_ms) as total_foreground_ms,
       count(*) as apps,
       max(observed_at) as observed_at,
       bool_or(is_demo) as has_demo_data
from public.usage_daily
group by user_id, device_id, local_date;

grant select on public.v_daily_activity to authenticated;
