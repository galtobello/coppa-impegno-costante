-- =====================================================================
-- 0010 · Commenti firmati, voti sempre anonimi
--  * v_player_comments mostra il nickname di chi ha scritto il commento
--  * il voto NON compare più accanto al commento (score = null): altrimenti,
--    con l'autore in chiaro, il voto non sarebbe più anonimo
--  * l'organizzatore può cancellare un commento (resta il voto)
--  Idempotente; le colonne nuove sono in coda alla vista.
-- =====================================================================

create or replace view public.v_player_comments as
select r.match_id, r.rated_id as player_id,
       null::smallint as score,              -- il voto resta anonimo
       r.comment, r.created_at,
       r.id as rating_id, r.rater_id as author_id, pl.nickname as author_nickname
from public.player_ratings r
left join public.players pl on pl.id = r.rater_id
where r.comment is not null and length(trim(r.comment)) > 0;

-- l'organizzatore svuota il commento; il voto a cui era legato resta valido
create or replace function public.remove_comment(p_rating uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_admin() then raise exception 'Solo l''organizzatore può cancellare i commenti'; end if;
  update public.player_ratings set comment = null where id = p_rating;
  if not found then raise exception 'Commento non trovato'; end if;
end $$;
revoke execute on function public.remove_comment(uuid) from public, anon;
grant execute on function public.remove_comment(uuid) to authenticated;

notify pgrst, 'reload schema';
