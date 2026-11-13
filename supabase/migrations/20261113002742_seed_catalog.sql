-- =============================================================================
-- GreenPath · Catálogo curado inicial (sin IA)
-- Cada recomendación explica qué hacer, por qué, con qué datos y supuestos, y su
-- esfuerzo/costo. Si no hay factor defendible, impact_note = 'No cuantificado'.
-- Fuente de factores alimentarios: Poore & Nemecek (2018), vía Our World in Data.
-- =============================================================================

insert into public.events (id, name, description) values
  ('carne_asada', 'Carne asada', 'Planea invitados, presupuesto y cantidades; compara menús y registra sobrantes.'),
  ('fiesta', 'Fiesta', 'Próximamente: planeación de fiestas con menos desperdicio.')
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into public.recommendations
  (id, section, event_id, title, what_to_do, why, data_and_assumptions, sources, effort, cost_level, cost_note, impact_note, tags)
values
  ('frijol_por_res', 'reducir_sin_gastar', null,
   'Prueba frijoles en lugar de parte de la res',
   'En tu siguiente comida con res, sustituye la mitad por frijoles.',
   'Por kilogramo, la carne de res de ganado de carne tiene un promedio global de 99.48 kg CO₂e y las legumbres 1.79 kg CO₂e.',
   'Promedios globales por kg de producto (Poore & Nemecek, 2018); no son específicos de México ni de una marca. Cambiar 100 g de res por 100 g de frijol equivale a unos 9.8 kg CO₂e menos en promedio global. Las porciones no son nutricionalmente equivalentes.',
   '[{"title":"Our World in Data · GHG per kg (Poore & Nemecek 2018)","url":"https://ourworldindata.org/grapher/ghg-per-kg-poore"}]',
   'minimo', 'sin_gasto', 'Sin gasto adicional si ya tienes frijoles en casa.',
   '≈ 9.8 kg CO₂e por cada 100 g sustituidos (promedio global, estimado)', '{alimentacion}'),

  ('pausa_pantalla', 'reducir_sin_gastar', null,
   'Haz una pausa de pantalla',
   'Elige la app que más usas y déjala 30 minutos hoy. GreenPath lo medirá en Mi impacto.',
   'Usar menos el teléfono puede reducir energía y transferencia de datos, pero no hay un factor con fuente para convertir minutos en CO₂e.',
   'Tu tiempo de uso se mide con Android. La reducción de CO₂e no se cuantifica; sí cuenta para tus puntos por reducir tiempo de uso.',
   '[]',
   'minimo', 'sin_gasto', null,
   'No cuantificado en CO₂e', '{digital}'),

  ('aprovecha_maduros', 'reducir_sin_gastar', null,
   'Usa primero lo que está por echarse a perder',
   'Revisa tu despensa y cocina hoy con lo más maduro.',
   'Los alimentos desechados llevan consigo las emisiones de su producción; aprovecharlos evita desperdiciarlas.',
   'La huella incorporada depende del alimento (por ejemplo, tomate 2.09 kg CO₂e/kg, promedio global). GreenPath no mide cuánto desperdicio evitas.',
   '[{"title":"Our World in Data · GHG per kg (Poore & Nemecek 2018)","url":"https://ourworldindata.org/grapher/ghg-per-kg-poore"}]',
   'minimo', 'sin_gasto', null,
   'No cuantificado', '{alimentacion,despensa}'),

  ('lista_super', 'reducir_sin_gastar', null,
   'Haz una lista antes de ir al súper',
   'Antes de comprar, revisa tu despensa en GreenPath y anota solo lo que falta.',
   'Comprar de más aumenta el riesgo de que algo se eche a perder.',
   'Recomendación de hábito; GreenPath no mide tus compras.',
   '[]',
   'minimo', 'sin_gasto', null,
   'No cuantificado', '{alimentacion,despensa}'),

  ('porciones_evento', 'eventos', 'carne_asada',
   'Calcula porciones antes de comprar',
   'Usa el planeador de Mis eventos para ajustar cantidades al número de invitados.',
   'En una carne asada, la res es el ingrediente con mayor huella por kilogramo; comprar de más aumenta la huella y el riesgo de desperdicio.',
   'Porciones del planeador son de demostración. Factores: promedios globales por kg (Poore & Nemecek, 2018).',
   '[{"title":"Our World in Data · GHG per kg (Poore & Nemecek 2018)","url":"https://ourworldindata.org/grapher/ghg-per-kg-poore"}]',
   'moderado', 'sin_gasto', null,
   'Depende de cuánto dejes de comprar', '{eventos,alimentacion}')
on conflict (id) do update set
  section = excluded.section, event_id = excluded.event_id, title = excluded.title,
  what_to_do = excluded.what_to_do, why = excluded.why,
  data_and_assumptions = excluded.data_and_assumptions, sources = excluded.sources,
  effort = excluded.effort, cost_level = excluded.cost_level, cost_note = excluded.cost_note,
  impact_note = excluded.impact_note, tags = excluded.tags, active = true;
