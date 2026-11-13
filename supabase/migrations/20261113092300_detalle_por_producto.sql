-- Desglose por producto de cada despensa guardada (para el dashboard):
-- [{productoId, nombre, ref_mxn, opt_mxn, ref_kg, opt_kg, cambio?}]
alter table public.optimizaciones add column if not exists detalle jsonb;

create or replace function public.guardar_optimizacion(p jsonb, p_idem text, p_pago_demo boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_plan text; v_saldo int; v_id uuid; v_modo text; v_precio numeric;
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

  if v_modo = 'gratis' then
    if not coalesce(p_pago_demo, false) then
      raise exception 'Guardar en tu historial requiere Plus o pagar este análisis';
    end if;
    select precio_analisis_mxn into v_precio from public.planes where id = 'gratis';
  end if;

  insert into public.optimizaciones (user_id, modo, origen, items, presupuesto, prioridad, referencia_tipo, referencia_detalle,
    total_referencia, total_optimizado, co2e_referencia, co2e_optimizado, tiendas, idem_key, pagado_demo_mxn, detalle)
  values (v_uid, v_modo, p->>'origen', p->'items', (p->>'presupuesto')::numeric, p->>'prioridad', p->>'referencia_tipo', p->>'referencia_detalle',
    (p->>'total_referencia')::numeric, (p->>'total_optimizado')::numeric, (p->>'co2e_referencia')::numeric, (p->>'co2e_optimizado')::numeric,
    coalesce(array(select jsonb_array_elements_text(p->'tiendas')), '{}'), p_idem, v_precio, p->'detalle')
  returning id into v_id;

  if v_modo = 'plus' then
    insert into public.movimientos_credito (user_id, tipo, cantidad, ciclo, optimizacion_id, detalle, idem_key)
    values (v_uid, 'consumo', -1, private.ciclo_actual(), v_id, 'Optimización completa', 'consumo-' || p_idem);
  end if;
  return jsonb_build_object('id', v_id, 'repetida', false, 'modo', v_modo, 'pagado_demo_mxn', v_precio) || public.mi_estado();
end $$;

revoke all on function public.guardar_optimizacion(jsonb, text, boolean) from public, anon;
grant execute on function public.guardar_optimizacion(jsonb, text, boolean) to authenticated;
