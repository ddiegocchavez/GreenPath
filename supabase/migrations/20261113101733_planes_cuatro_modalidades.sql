-- GreenPath · cuatro modalidades (MODO DEMOSTRACIÓN, sin cobros reales):
--   gratis      $0            diagnóstico y comparación básica (modelo básico)
--   individual  $29 por pago  un análisis completo (modelo avanzado) cuando lo necesites
--   flex        $59 / mes     2 análisis completos al mes
--   plus        $99 / mes     4 análisis completos al mes
-- Precios y análisis incluidos se configuran en public.planes.

alter table public.planes add column if not exists tipo text not null default 'suscripcion'
  check (tipo in ('gratis', 'pago_unico', 'suscripcion'));
update public.planes set tipo = 'gratis', precio_analisis_mxn = null where id = 'gratis';
update public.planes set tipo = 'suscripcion' where id = 'plus';
insert into public.planes (id, nombre, precio_mxn, optimizaciones_incluidas, umbral_compensacion_mxn, descripcion, tipo) values
  ('individual', 'GreenPath Individual', 29, 1, null, 'Un análisis completo por pago, sin suscripción.', 'pago_unico'),
  ('flex', 'GreenPath Flex', 59, 2, 15, 'Dos análisis completos al mes.', 'suscripcion')
on conflict (id) do update set precio_mxn = excluded.precio_mxn, optimizaciones_incluidas = excluded.optimizaciones_incluidas,
  tipo = excluded.tipo, nombre = excluded.nombre, descripcion = excluded.descripcion, umbral_compensacion_mxn = excluded.umbral_compensacion_mxn;

-- Lista habitual del onboarding (para calcular el ahorro con precios reales antes de recomendar un plan).
alter table public.perfiles add column if not exists lista_habitual jsonb not null default '[]';
grant insert (lista_habitual), update (lista_habitual) on public.perfiles to authenticated;

-- modo de cada optimización = modalidad con la que se hizo.
alter table public.optimizaciones drop constraint if exists optimizaciones_modo_check;
alter table public.optimizaciones add constraint optimizaciones_modo_check check (modo in ('gratis', 'individual', 'flex', 'plus'));

-- Asignación mensual para cualquier suscripción (flex, plus).
create or replace function private.asegurar_asignacion(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_plan text; v_incluidas int; v_tipo text; v_ciclo text := private.ciclo_actual();
begin
  select pe.plan, pl.optimizaciones_incluidas, pl.tipo into v_plan, v_incluidas, v_tipo
    from public.perfiles pe join public.planes pl on pl.id = pe.plan where pe.user_id = p_user;
  if v_tipo = 'suscripcion' and v_incluidas > 0 then
    insert into public.movimientos_credito (user_id, tipo, cantidad, ciclo, detalle, idem_key)
    values (p_user, 'asignacion_mensual', v_incluidas, v_ciclo, format('Análisis incluidos en %s (demo)', v_plan), 'asignacion-' || v_plan || '-' || v_ciclo)
    on conflict (user_id, idem_key) do nothing;
  end if;
end $$;

create or replace function public.cambiar_plan_demo(p_plan text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Sin sesión'; end if;
  if p_plan not in ('gratis', 'flex', 'plus') then raise exception 'Plan inválido (Individual se paga por análisis)'; end if;
  update public.perfiles set plan = p_plan, plan_desde = case when p_plan = 'gratis' then null else now() end, actualizado_en = now()
   where user_id = v_uid;
  if not found then raise exception 'Primero completa tu perfil'; end if;
  return public.mi_estado();
end $$;

-- Guardar: suscripción con créditos → análisis completo (consume 1). Sin créditos: pagar Individual (demo) o error.
create or replace function public.guardar_optimizacion(p jsonb, p_idem text, p_pago_demo boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_plan text; v_tipo text; v_saldo int; v_id uuid; v_modo text; v_precio numeric;
begin
  if v_uid is null then raise exception 'Sin sesión'; end if;
  if p_idem is null or length(p_idem) < 8 then raise exception 'idem_key inválida'; end if;

  select id into v_id from public.optimizaciones where user_id = v_uid and idem_key = p_idem;
  if v_id is not null then return jsonb_build_object('id', v_id, 'repetida', true) || public.mi_estado(); end if;

  perform private.asegurar_asignacion(v_uid);
  select coalesce(pe.plan, 'gratis'), pl.tipo into v_plan, v_tipo from public.perfiles pe join public.planes pl on pl.id = pe.plan where pe.user_id = v_uid;
  v_plan := coalesce(v_plan, 'gratis');
  select coalesce(sum(cantidad), 0) into v_saldo from public.movimientos_credito where user_id = v_uid;

  if v_tipo = 'suscripcion' and v_saldo > 0 then
    v_modo := v_plan;
  elsif coalesce(p_pago_demo, false) then
    v_modo := 'individual';
    select precio_mxn into v_precio from public.planes where id = 'individual';
  elsif (p->>'modo') = 'avanzado' then
    raise exception 'Sin análisis disponibles: paga un análisis Individual o cambia de plan';
  else
    raise exception 'Guardar en tu historial requiere un análisis Individual o un plan Flex/Plus';
  end if;

  insert into public.optimizaciones (user_id, modo, origen, items, presupuesto, prioridad, referencia_tipo, referencia_detalle,
    total_referencia, total_optimizado, co2e_referencia, co2e_optimizado, tiendas, idem_key, pagado_demo_mxn, detalle, ahorro_adicional_plus, productos_excluidos)
  values (v_uid, v_modo, p->>'origen', p->'items', (p->>'presupuesto')::numeric, p->>'prioridad', p->>'referencia_tipo', p->>'referencia_detalle',
    (p->>'total_referencia')::numeric, (p->>'total_optimizado')::numeric, (p->>'co2e_referencia')::numeric, (p->>'co2e_optimizado')::numeric,
    coalesce(array(select jsonb_array_elements_text(p->'tiendas')), '{}'), p_idem, v_precio, p->'detalle', (p->>'ahorro_adicional_plus')::numeric,
    coalesce(array(select jsonb_array_elements_text(p->'productos_excluidos')), '{}'))
  returning id into v_id;

  if v_modo in ('flex', 'plus') then
    insert into public.movimientos_credito (user_id, tipo, cantidad, ciclo, optimizacion_id, detalle, idem_key)
    values (v_uid, 'consumo', -1, private.ciclo_actual(), v_id, 'Análisis completo', 'consumo-' || p_idem);
  end if;
  return jsonb_build_object('id', v_id, 'repetida', false, 'modo', v_modo, 'pagado_demo_mxn', v_precio) || public.mi_estado();
end $$;

-- Compensación: aplica a análisis de suscripción; umbral del plan con el que se hizo.
create or replace function public.evaluar_compensacion(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid()); o public.optimizaciones; v_umbral numeric; v_ahorro numeric; v_cumple boolean; v_otorgado boolean := false;
begin
  select * into o from public.optimizaciones where id = p_id and user_id = v_uid;
  if not found then raise exception 'No encontrada'; end if;
  select umbral_compensacion_mxn into v_umbral from public.planes where id = o.modo;
  v_ahorro := coalesce(o.ahorro_adicional_plus, o.total_referencia - o.total_optimizado, 0);
  v_cumple := o.modo in ('flex', 'plus') and v_umbral is not null and v_ahorro < v_umbral;
  if v_cumple then
    insert into public.movimientos_credito (user_id, tipo, cantidad, ciclo, optimizacion_id, detalle, idem_key)
    values (v_uid, 'compensacion', 1, private.ciclo_actual(), p_id,
            format('Compensación demo: ahorro adicional estimado $%s menor al umbral $%s', round(v_ahorro, 2), v_umbral), 'compensacion-' || p_id)
    on conflict (user_id, idem_key) do nothing;
    v_otorgado := found;
  end if;
  return jsonb_build_object('cumple', v_cumple, 'otorgado', v_otorgado, 'ahorro_estimado', round(v_ahorro, 2), 'umbral', v_umbral);
end $$;

revoke all on function public.guardar_optimizacion(jsonb, text, boolean), public.cambiar_plan_demo(text), public.evaluar_compensacion(uuid) from public, anon;
grant execute on function public.guardar_optimizacion(jsonb, text, boolean), public.cambiar_plan_demo(text), public.evaluar_compensacion(uuid) to authenticated;
revoke all on function private.asegurar_asignacion(uuid) from public, anon, authenticated;
