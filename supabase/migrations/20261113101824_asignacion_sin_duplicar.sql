-- Plus conserva la clave de asignación anterior ('asignacion-AAAA-MM') para no asignar dos veces en el mismo ciclo.
create or replace function private.asegurar_asignacion(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_plan text; v_incluidas int; v_tipo text; v_ciclo text := private.ciclo_actual();
begin
  select pe.plan, pl.optimizaciones_incluidas, pl.tipo into v_plan, v_incluidas, v_tipo
    from public.perfiles pe join public.planes pl on pl.id = pe.plan where pe.user_id = p_user;
  if v_tipo = 'suscripcion' and v_incluidas > 0 then
    insert into public.movimientos_credito (user_id, tipo, cantidad, ciclo, detalle, idem_key)
    values (p_user, 'asignacion_mensual', v_incluidas, v_ciclo, format('Análisis incluidos en %s (demo)', v_plan),
            case when v_plan = 'plus' then 'asignacion-' || v_ciclo else 'asignacion-' || v_plan || '-' || v_ciclo end)
    on conflict (user_id, idem_key) do nothing;
  end if;
end $$;
revoke all on function private.asegurar_asignacion(uuid) from public, anon, authenticated;
