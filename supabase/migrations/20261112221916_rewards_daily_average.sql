-- =============================================================================
-- GreenPath · Recompensas v2: comparar PROMEDIO DIARIO, no totales.
-- Motivo: con distinto número de días con datos, comparar totales hace que un día
-- sin registro parezca una reducción. Regla: reducción = (prom_anterior - prom_actual) / prom_anterior.
-- =============================================================================
create or replace function public.weekly_reduction(p_device uuid, p_today date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  v_end date := p_today - 1;
  cur_start date := p_today - 7;
  prev_start date := p_today - 14;
  prev_end date := p_today - 8;
  cur_ms bigint; prev_ms bigint;
  cur_days int; prev_days int;
  cur_avg numeric; prev_avg numeric;
  cur_demo boolean; prev_demo boolean;
  pct numeric; pts int := 0;
  comparable boolean;
  reason text := null;
  last_claim date;
begin
  if uid is null then
    raise exception 'sesion requerida' using errcode = '28000';
  end if;
  if p_today not between (current_date - 1) and (current_date + 1) then
    raise exception 'fecha fuera de rango' using errcode = '22023';
  end if;

  select coalesce(sum(total_foreground_ms), 0), count(*), coalesce(bool_or(has_demo_data), false)
    into cur_ms, cur_days, cur_demo
  from public.v_daily_activity
  where user_id = uid and device_id = p_device and local_date between cur_start and v_end;

  select coalesce(sum(total_foreground_ms), 0), count(*), coalesce(bool_or(has_demo_data), false)
    into prev_ms, prev_days, prev_demo
  from public.v_daily_activity
  where user_id = uid and device_id = p_device and local_date between prev_start and prev_end;

  cur_avg := case when cur_days > 0 then cur_ms::numeric / cur_days end;
  prev_avg := case when prev_days > 0 then prev_ms::numeric / prev_days end;

  comparable := cur_days >= 5 and prev_days >= 5 and coalesce(prev_avg, 0) > 0;
  if not comparable then
    reason := format('Se necesitan al menos 5 días con datos en cada periodo (actual: %s, anterior: %s).',
                     cur_days, prev_days);
  else
    pct := round(((prev_avg - cur_avg) / prev_avg) * 100, 2);
    if pct >= 5 then
      pts := least(500, floor(pct * 10)::int);
    end if;
  end if;

  select max(window_end) into last_claim
  from public.points_ledger
  where user_id = uid and device_id = p_device and window_end is not null;

  return jsonb_build_object(
    'rule_version', 'reduccion-actividad-v2-promedio-diario',
    'current', jsonb_build_object('start', cur_start, 'end', v_end, 'ms', cur_ms, 'days', cur_days,
                                  'avg_ms', round(coalesce(cur_avg, 0))),
    'previous', jsonb_build_object('start', prev_start, 'end', prev_end, 'ms', prev_ms, 'days', prev_days,
                                   'avg_ms', round(coalesce(prev_avg, 0))),
    'comparable', comparable,
    'reason', reason,
    'reduction_pct', pct,
    'points', pts,
    'includes_demo_data', cur_demo or prev_demo,
    'last_claim_window_end', last_claim,
    'can_claim', comparable and pts > 0 and (last_claim is null or v_end >= last_claim + 7)
  );
end;
$$;
