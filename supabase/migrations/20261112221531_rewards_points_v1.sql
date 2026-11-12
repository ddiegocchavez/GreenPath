-- =============================================================================
-- GreenPath · Recompensas por reducción de actividad medida
--
-- Regla v1 (explicable):
--   - Se comparan los últimos 7 días completos con los 7 anteriores, por dispositivo.
--   - Solo si ambos periodos son comparables: >= 5 días con datos cada uno.
--   - Reducción = (anterior - actual) / anterior.
--   - Puntos = 10 por cada 1 % de reducción, desde 5 %, máximo 500. Si sube, 0 (sin castigo).
--   - Se reclama una vez por ventana de 7 días; las ventanas no se traslapan.
-- Es reducción de ACTIVIDAD medida, no de CO2 (sin factor con fuente todavía).
-- =============================================================================

alter table public.points_ledger
  add column device_id uuid references public.devices (id) on delete set null,
  add column window_end date,
  add column reduction_pct numeric(6, 2),
  add column rule_version text,
  add column is_demo boolean not null default false;

create unique index points_ledger_window_uidx
  on public.points_ledger (user_id, device_id, window_end)
  where window_end is not null;
create index points_ledger_device_id_idx on public.points_ledger (device_id);

-- -----------------------------------------------------------------------------
-- Estado de la comparación semanal (solo lectura, con RLS del usuario)
-- -----------------------------------------------------------------------------
create or replace function public.weekly_reduction(p_device uuid, p_today date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  v_end date := p_today - 1;          -- último día completo
  cur_start date := p_today - 7;
  prev_start date := p_today - 14;
  prev_end date := p_today - 8;
  cur_ms bigint; prev_ms bigint;
  cur_days int; prev_days int;
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

  comparable := cur_days >= 5 and prev_days >= 5 and prev_ms > 0;
  if not comparable then
    reason := format('Se necesitan al menos 5 días con datos en cada periodo (actual: %s, anterior: %s).',
                     cur_days, prev_days);
  else
    pct := round(((prev_ms - cur_ms)::numeric / prev_ms) * 100, 2);
    if pct >= 5 then
      pts := least(500, floor(pct * 10)::int);
    end if;
  end if;

  select max(window_end) into last_claim
  from public.points_ledger
  where user_id = uid and device_id = p_device and window_end is not null;

  return jsonb_build_object(
    'rule_version', 'reduccion-actividad-v1',
    'current', jsonb_build_object('start', cur_start, 'end', v_end, 'ms', cur_ms, 'days', cur_days),
    'previous', jsonb_build_object('start', prev_start, 'end', prev_end, 'ms', prev_ms, 'days', prev_days),
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

revoke execute on function public.weekly_reduction(uuid, date) from public, anon;
grant execute on function public.weekly_reduction(uuid, date) to authenticated;

-- -----------------------------------------------------------------------------
-- Reclamar puntos: corre como definer para poder escribir en points_ledger,
-- pero solo para auth.uid() y recalculando en el servidor (no confía en el cliente).
-- -----------------------------------------------------------------------------
create or replace function public.claim_weekly_points(p_device uuid, p_today date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  st jsonb;
  v_end date := p_today - 1;
begin
  if uid is null then
    raise exception 'sesion requerida' using errcode = '28000';
  end if;
  if not exists (select 1 from public.devices d where d.id = p_device and d.user_id = uid) then
    raise exception 'dispositivo no pertenece a esta cuenta' using errcode = '42501';
  end if;

  -- Recalcula en el servidor; weekly_reduction filtra por auth.uid().
  st := public.weekly_reduction(p_device, p_today);

  if not (st ->> 'can_claim')::boolean then
    return jsonb_build_object('ok', false, 'status', st);
  end if;

  insert into public.points_ledger (user_id, device_id, points, reason, window_end, reduction_pct, rule_version, is_demo)
  values (uid, p_device, (st ->> 'points')::int,
          format('Reducción de actividad de %s%% (%s a %s)', st ->> 'reduction_pct',
                 st -> 'current' ->> 'start', st -> 'current' ->> 'end'),
          v_end, (st ->> 'reduction_pct')::numeric, st ->> 'rule_version',
          (st ->> 'includes_demo_data')::boolean)
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'points', (st ->> 'points')::int, 'status', st);
end;
$$;

revoke execute on function public.claim_weekly_points(uuid, date) from public, anon;
grant execute on function public.claim_weekly_points(uuid, date) to authenticated;
