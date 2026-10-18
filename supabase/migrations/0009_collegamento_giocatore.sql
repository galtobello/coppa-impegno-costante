-- =====================================================================
-- 0009 · Collegamento utente → giocatore sempre coerente
--  * quando a un utente viene collegato un giocatore (da "Accetta" o da
--    "Salva" nella lista utenti) il giocatore viene abilitato e riceve il
--    nome completo indicato alla registrazione
--  * collegare un giocatore a un utente ancora "in attesa" equivale ad
--    accettarlo (prima restava in attesa per sempre)
--  L'email resta solo nel profilo (leggibile dall'organizzatore): la tabella
--  players è pubblica e non deve contenere dati personali. Idempotente.
-- =====================================================================

create or replace function app.profiles_link_player()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.player_id is not null and new.player_id is distinct from old.player_id then
    if new.status = 'pending' then
      new.status := 'approved';
      new.reviewed_at := now();
    end if;
    update public.players
       set active = true,
           full_name = coalesce(nullif(trim(new.requested_full_name), ''), full_name)
     where id = new.player_id;
  end if;
  return new;
end $$;

create or replace trigger profiles_link_player before update on public.profiles
  for each row execute function app.profiles_link_player();

-- Accetta: come prima, ma il nome indicato alla registrazione aggiorna quello del giocatore
create or replace function public.approve_registration(p_user uuid, p_role public.user_role default 'player')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  prof public.profiles;
  v_player uuid;
  v_other text;
begin
  if not app.is_admin() then raise exception 'Solo l''organizzatore può accettare le registrazioni'; end if;
  select * into prof from public.profiles where id = p_user;
  if prof.id is null then raise exception 'Utente non trovato'; end if;
  if coalesce(trim(prof.requested_nickname), '') = '' then raise exception 'La registrazione non ha un nickname'; end if;

  select id into v_player from public.players where lower(nickname) = lower(trim(prof.requested_nickname));
  if v_player is null then
    insert into public.players (nickname, full_name, active)
    values (trim(prof.requested_nickname), nullif(trim(prof.requested_full_name), ''), true)
    returning id into v_player;
  else
    select email into v_other from public.profiles where player_id = v_player and id <> p_user;
    if v_other is not null then
      raise exception 'Il giocatore % è già collegato all''utente %', prof.requested_nickname, v_other;
    end if;
  end if;

  update public.profiles
     set player_id = v_player, role = p_role, status = 'approved', reviewed_at = now()
   where id = p_user;
  -- abilita e completa il giocatore anche se era già collegato (il trigger scatta solo se cambia)
  update public.players
     set active = true,
         full_name = coalesce(nullif(trim(prof.requested_full_name), ''), full_name)
   where id = v_player;
  return v_player;
end $$;

-- sistema gli utenti rimasti "in attesa" pur avendo già un giocatore collegato
update public.profiles set status = 'approved', reviewed_at = now()
 where status = 'pending' and player_id is not null;
update public.players pl
   set active = true,
       full_name = coalesce(nullif(trim(p.requested_full_name), ''), pl.full_name)
  from public.profiles p
 where p.player_id = pl.id and p.status = 'approved' and p.requested_nickname is not null;

notify pgrst, 'reload schema';
