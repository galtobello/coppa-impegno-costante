-- =====================================================================
-- 0007 · Radar a 6 assi: "Velocità e resistenza" diventa due voci
--  la colonna velocita resta (ora solo Velocità), si aggiunge resistenza.
--  Le policy RLS di player_skills valgono per riga: nessuna modifica. Idempotente.
-- =====================================================================
alter table public.player_skills
  add column if not exists resistenza smallint not null default 0 check (resistenza between 0 and 5);

notify pgrst, 'reload schema';
