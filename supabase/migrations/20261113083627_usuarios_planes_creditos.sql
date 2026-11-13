-- GreenPath · perfiles (encuesta), planes, optimizaciones, créditos y revisiones de periodo.
-- Cuentas anónimas de Supabase: cada usuario solo ve y modifica lo suyo (RLS).
-- Los créditos y el plan solo cambian mediante funciones del servidor (no hay escritura directa).

-- ---------- Planes (configurables; lectura pública) ----------
create table public.planes (
  id                        text primary key,           -- 'gratis' | 'plus'
  nombre                    text not null,
  precio_mxn                numeric(8,2) not null default 0,
  optimizaciones_incluidas  int not null default 0,      -- por ciclo mensual
  umbral_compensacion_mxn   numeric(8,2),                -- si el ahorro adicional estimado es menor, aplica crédito de compensación
  descripcion               text
);
insert into public.planes values
  ('gratis', 'GreenPath Gratis', 0, 0, null, 'Perfil, comparación por tienda, CO2e estimado e historial básico.'),
  ('plus', 'GreenPath Plus', 99, 4, 25, 'Cuatro optimizaciones completas al mes, combinaciones de tiendas, presupuesto, calidad y sustentabilidad.');

-- ---------- Perfil = respuestas de la encuesta ----------
create table public.perfiles (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  nombre                text,
  uso                   text check (uso in ('hogar','evento','negocio')),
  personas              int check (personas between 1 and 15),
  frecuencia            text check (frecuencia in ('semanal','quincenal','mensual','otra')),
  frecuencia_dias       int check (frecuencia_dias between 1 and 90),
  gasto_por_despensa    numeric(10,2) check (gasto_por_despensa >= 0),
  problemas             text[] not null default '{}',
  no_cambiar            text[] not null default '{}',
  no_cambiar_detalle    text,
  restricciones         text[] not null default '{}',   -- 'vegetariano' | 'sin_lactosa'
  supermercados         text[] not null default '{}',   -- ids de public.tiendas
  alternativas_aceptadas text[] not null default '{}',
  alternativas_rechazadas text[] not null default '{}',
  plan                  text not null default 'gratis' references public.planes(id),
  plan_desde            timestamptz,
  encuesta_completada_en timestamptz,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

-- ---------- Optimizaciones guardadas ----------
create table public.optimizaciones (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  creada_en           timestamptz not null default now(),
  modo                text not null check (modo in ('gratis','plus')),
  origen              text not null check (origen in ('lista','ticket')),
  items               jsonb not null,                    -- [{productoId, cantidad, precioTicket?}]
  presupuesto         numeric(10,2),
  prioridad           text,
  referencia_tipo     text not null check (referencia_tipo in ('ticket','super_habitual','sin_referencia')),
  referencia_detalle  text,
  total_referencia    numeric(10,2),
  total_optimizado    numeric(10,2) not null,
  co2e_referencia     numeric(10,2),
  co2e_optimizado     numeric(10,2),
  tiendas             text[] not null default '{}',
  gasto_real          numeric(10,2),                     -- lo que pagó después (ahorro comprobado)
  gasto_real_en       timestamptz,
  idem_key            text not null,
  unique (user_id, idem_key)
);
create index optimizaciones_user_idx on public.optimizaciones (user_id, creada_en desc);

-- ---------- Movimientos de créditos (libro mayor; el saldo es la suma) ----------
create table public.movimientos_credito (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  creado_en        timestamptz not null default now(),
  tipo             text not null check (tipo in ('asignacion_mensual','consumo','compensacion','demo_paquete')),
  cantidad         int not null check (cantidad <> 0),
  ciclo            text not null,                         -- 'AAAA-MM'
  optimizacion_id  uuid references public.optimizaciones(id) on delete set null,
  detalle          text,
  idem_key         text not null,
  unique (user_id, idem_key)                              -- evita cargos/abonos duplicados
);
create index movimientos_user_idx on public.movimientos_credito (user_id, creado_en desc);

-- ---------- Revisión de fin de periodo (desperdicio / agotados / sobrantes) ----------
create table public.revisiones (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  optimizacion_id   uuid references public.optimizaciones(id) on delete cascade,
  creada_en         timestamptz not null default now(),
  agotados          text[] not null default '{}',
  desperdiciados    text[] not null default '{}',
  sobrantes         text[] not null default '{}',
  costo_desperdicio numeric(10,2)
);
create index revisiones_user_idx on public.revisiones (user_id, creada_en desc);

-- ---------- RLS ----------
alter table public.planes enable row level security;
alter table public.perfiles enable row level security;
alter table public.optimizaciones enable row level security;
alter table public.movimientos_credito enable row level security;
alter table public.revisiones enable row level security;

create policy "planes lectura" on public.planes for select to anon, authenticated using (true);

create policy "perfil propio: ver" on public.perfiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "perfil propio: crear" on public.perfiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "perfil propio: editar" on public.perfiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "perfil propio: borrar" on public.perfiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy "optimizaciones propias: ver" on public.optimizaciones for select to authenticated using ((select auth.uid()) = user_id);
create policy "optimizaciones propias: borrar" on public.optimizaciones for delete to authenticated using ((select auth.uid()) = user_id);

create policy "movimientos propios: ver" on public.movimientos_credito for select to authenticated using ((select auth.uid()) = user_id);

create policy "revisiones propias: ver" on public.revisiones for select to authenticated using ((select auth.uid()) = user_id);
create policy "revisiones propias: crear" on public.revisiones for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "revisiones propias: borrar" on public.revisiones for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.planes, public.perfiles, public.optimizaciones, public.movimientos_credito, public.revisiones from anon, authenticated;
grant select on public.planes to anon, authenticated;
-- El plan y su fecha solo cambian por función; el resto del perfil lo edita el usuario.
grant select, delete on public.perfiles to authenticated;
grant insert (user_id, nombre, uso, personas, frecuencia, frecuencia_dias, gasto_por_despensa, problemas, no_cambiar, no_cambiar_detalle,
  restricciones, supermercados, alternativas_aceptadas, alternativas_rechazadas, encuesta_completada_en) on public.perfiles to authenticated;
grant update (nombre, uso, personas, frecuencia, frecuencia_dias, gasto_por_despensa, problemas, no_cambiar, no_cambiar_detalle,
  restricciones, supermercados, alternativas_aceptadas, alternativas_rechazadas, encuesta_completada_en, actualizado_en) on public.perfiles to authenticated;
grant select, delete on public.optimizaciones to authenticated;
grant select on public.movimientos_credito to authenticated;
grant select, insert, delete on public.revisiones to authenticated;

-- ---------- Funciones del servidor ----------
create schema if not exists private;

create or replace function private.ciclo_actual() returns text
language sql stable set search_path = '' as $$ select to_char(now() at time zone 'America/Mexico_City', 'YYYY-MM') $$;

create or replace function private.asegurar_asignacion(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_plan text; v_incluidas int; v_ciclo text := private.ciclo_actual();
begin
  select pe.plan, pl.optimizaciones_incluidas into v_plan, v_incluidas
    from public.perfiles pe join public.planes pl on pl.id = pe.plan where pe.user_id = p_user;
  if v_plan = 'plus' and v_incluidas > 0 then
    insert into public.movimientos_credito (user_id, tipo, cantidad, ciclo, detalle, idem_key)
    values (p_user, 'asignacion_mensual', v_incluidas, v_ciclo, 'Optimizaciones incluidas en Plus (demo)', 'asignacion-' || v_ciclo)
    on conflict (user_id, idem_key) do nothing;
  end if;
end $$;

-- Saldo y estado del plan.
create or replace function public.mi_estado() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v jsonb;
begin
  if v_uid is null then raise exception 'Sin sesión'; end if;
  perform private.asegurar_asignacion(v_uid);
  select jsonb_build_object(
    'plan', coalesce(pe.plan, 'gratis'),
    'plan_desde', pe.plan_desde,
    'ciclo', private.ciclo_actual(),
    'saldo', coalesce((select sum(m.cantidad) from public.movimientos_credito m where m.user_id = v_uid), 0),
    'usadas_ciclo', coalesce((select -sum(m.cantidad) from public.movimientos_credito m
                              where m.user_id = v_uid and m.tipo = 'consumo' and m.ciclo = private.ciclo_actual()), 0)
  ) into v from public.perfiles pe where pe.user_id = v_uid;
  return coalesce(v, jsonb_build_object('plan', 'gratis', 'saldo', 0, 'usadas_ciclo', 0, 'ciclo', private.ciclo_actual()));
end $$;

-- Activar / cancelar Plus en MODO DEMOSTRACIÓN (sin cobro).
create or replace function public.cambiar_plan_demo(p_plan text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Sin sesión'; end if;
  if p_plan not in ('gratis','plus') then raise exception 'Plan inválido'; end if;
  update public.perfiles set plan = p_plan, plan_desde = case when p_plan = 'plus' then now() else null end, actualizado_en = now()
   where user_id = v_uid;
  if not found then raise exception 'Primero completa tu perfil'; end if;
  return public.mi_estado();
end $$;

-- Guardar una optimización. En Plus consume 1 crédito; idempotente por idem_key (no cobra dos veces).
create or replace function public.guardar_optimizacion(p jsonb, p_idem text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_plan text; v_saldo int; v_id uuid; v_modo text;
begin
  if v_uid is null then raise exception 'Sin sesión'; end if;
  if p_idem is null or length(p_idem) < 8 then raise exception 'idem_key inválida'; end if;

  select id into v_id from public.optimizaciones where user_id = v_uid and idem_key = p_idem;
  if v_id is not null then return jsonb_build_object('id', v_id, 'repetida', true) || public.mi_estado(); end if;

  perform private.asegurar_asignacion(v_uid);
  select coalesce(plan, 'gratis') into v_plan from public.perfiles where user_id = v_uid;
  v_plan := coalesce(v_plan, 'gratis');
  select coalesce(sum(cantidad), 0) into v_saldo from public.movimientos_credito where user_id = v_uid;
  v_modo := case when v_plan = 'plus' and v_saldo > 0 then 'plus' else 'gratis' end;
  if (p->>'modo') = 'plus' and v_modo <> 'plus' then raise exception 'Sin créditos disponibles'; end if;

  insert into public.optimizaciones (user_id, modo, origen, items, presupuesto, prioridad, referencia_tipo, referencia_detalle,
    total_referencia, total_optimizado, co2e_referencia, co2e_optimizado, tiendas, idem_key)
  values (v_uid, v_modo, p->>'origen', p->'items', (p->>'presupuesto')::numeric, p->>'prioridad', p->>'referencia_tipo', p->>'referencia_detalle',
    (p->>'total_referencia')::numeric, (p->>'total_optimizado')::numeric, (p->>'co2e_referencia')::numeric, (p->>'co2e_optimizado')::numeric,
    coalesce(array(select jsonb_array_elements_text(p->'tiendas')), '{}'), p_idem)
  returning id into v_id;

  if v_modo = 'plus' then
    insert into public.movimientos_credito (user_id, tipo, cantidad, ciclo, optimizacion_id, detalle, idem_key)
    values (v_uid, 'consumo', -1, private.ciclo_actual(), v_id, 'Optimización completa', 'consumo-' || p_idem);
  end if;
  return jsonb_build_object('id', v_id, 'repetida', false, 'modo', v_modo) || public.mi_estado();
end $$;

-- Ahorro comprobado: el usuario registra lo que realmente pagó.
create or replace function public.registrar_gasto_real(p_id uuid, p_monto numeric) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_monto is null or p_monto < 0 then raise exception 'Monto inválido'; end if;
  update public.optimizaciones set gasto_real = p_monto, gasto_real_en = now()
   where id = p_id and user_id = (select auth.uid());
  if not found then raise exception 'No encontrada'; end if;
end $$;

-- Compensación (DEMO): si un análisis Plus estimó un ahorro adicional menor al umbral del plan, devuelve 1 crédito. Una sola vez por análisis.
create or replace function public.evaluar_compensacion(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid()); o public.optimizaciones; v_umbral numeric; v_ahorro numeric; v_cumple boolean; v_otorgado boolean := false;
begin
  select * into o from public.optimizaciones where id = p_id and user_id = v_uid;
  if not found then raise exception 'No encontrada'; end if;
  select umbral_compensacion_mxn into v_umbral from public.planes where id = 'plus';
  v_ahorro := coalesce(o.total_referencia - o.total_optimizado, 0);
  v_cumple := o.modo = 'plus' and o.total_referencia is not null and v_umbral is not null and v_ahorro < v_umbral;
  if v_cumple then
    insert into public.movimientos_credito (user_id, tipo, cantidad, ciclo, optimizacion_id, detalle, idem_key)
    values (v_uid, 'compensacion', 1, private.ciclo_actual(), p_id,
            format('Compensación demo: ahorro estimado $%s menor al umbral $%s', round(v_ahorro, 2), v_umbral), 'compensacion-' || p_id)
    on conflict (user_id, idem_key) do nothing;
    v_otorgado := found;
  end if;
  return jsonb_build_object('cumple', v_cumple, 'otorgado', v_otorgado, 'ahorro_estimado', round(v_ahorro, 2), 'umbral', v_umbral);
end $$;

-- Borrar todos mis datos (perfil, optimizaciones, créditos, revisiones).
create or replace function public.borrar_mis_datos() returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Sin sesión'; end if;
  delete from public.movimientos_credito where user_id = v_uid;
  delete from public.revisiones where user_id = v_uid;
  delete from public.optimizaciones where user_id = v_uid;
  delete from public.perfiles where user_id = v_uid;
end $$;

revoke all on function public.mi_estado(), public.cambiar_plan_demo(text), public.guardar_optimizacion(jsonb, text),
  public.registrar_gasto_real(uuid, numeric), public.evaluar_compensacion(uuid), public.borrar_mis_datos() from public, anon;
grant execute on function public.mi_estado(), public.cambiar_plan_demo(text), public.guardar_optimizacion(jsonb, text),
  public.registrar_gasto_real(uuid, numeric), public.evaluar_compensacion(uuid), public.borrar_mis_datos() to authenticated;
revoke all on function private.ciclo_actual(), private.asegurar_asignacion(uuid) from public, anon, authenticated;
