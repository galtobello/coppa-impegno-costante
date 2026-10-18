-- =====================================================================
-- 0008 · Registrazione con approvazione dell'organizzatore (al posto degli inviti)
--  * alla registrazione si indicano nickname e nome e cognome
--  * il nuovo utente resta "in attesa" finché un admin non accetta o rifiuta
--  * accettando: se il nickname esiste già tra i giocatori l'utente viene collegato,
--    altrimenti il giocatore viene creato
--  * l'admin può eliminare un utente registrato (il giocatore resta)
--  * finché non è approvato un utente non ha alcun potere (né voto né ruoli)
-- Il primo utente in assoluto resta organizzatore approvato. Idempotente.
-- =====================================================================

-- stato della registrazione: chi è già registrato resta approvato, i nuovi partono in attesa
alter table public.profiles add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved', 'rejected'));
alter table public.profiles alter column status set default 'pending';
alter table public.profiles add column if not exists requested_nickname  text;
alter table public.profiles add column if not exists requested_full_name text;
alter table public.profiles add column if not exists reviewed_at timestamptz;

-- nuovo utente: niente più inviti, si salvano i dati indicati alla registrazione
create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, email, role, status, requested_nickname, requested_full_name)
  values (
    new.id,
    lower(new.email),
    case when first_user then 'admin'::public.user_role else 'player'::public.user_role end,
    case when first_user then 'approved' else 'pending' end,
    nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- i poteri valgono solo per gli utenti approvati
create or replace function app.my_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid()) and status = 'approved';
$$;
create or replace function app.my_player_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select player_id from public.profiles where id = (select auth.uid()) and status = 'approved';
$$;
create or replace function app.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = (select auth.uid()) and status = 'approved'), false);
$$;
create or replace function app.can_score()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role::text in ('admin', 'scorekeeper', 'coach') from public.profiles where id = (select auth.uid()) and status = 'approved'), false);
$$;
create or replace function app.can_rate_skills()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role::text in ('admin', 'coach') from public.profiles where id = (select auth.uid()) and status = 'approved'), false);
$$;

-- Accetta una registrazione: collega il giocatore con lo stesso nickname o lo crea
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
  if coalesce(prof.requested_nickname, '') = '' then raise exception 'La registrazione non ha un nickname'; end if;

  select id into v_player from public.players where lower(nickname) = lower(prof.requested_nickname);
  if v_player is null then
    insert into public.players (nickname, full_name, active)
    values (prof.requested_nickname, prof.requested_full_name, true)
    returning id into v_player;
  else
    select email into v_other from public.profiles where player_id = v_player and id <> p_user;
    if v_other is not null then
      raise exception 'Il giocatore % è già collegato all''utente %', prof.requested_nickname, v_other;
    end if;
    update public.players set active = true,
           full_name = coalesce(full_name, prof.requested_full_name)
     where id = v_player;
  end if;

  update public.profiles
     set player_id = v_player, role = p_role, status = 'approved', reviewed_at = now()
   where id = p_user;
  return v_player;
end $$;

-- Rifiuta una registrazione (l'utente resta in elenco tra i rifiutati, senza poteri)
create or replace function public.reject_registration(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_admin() then raise exception 'Solo l''organizzatore può rifiutare le registrazioni'; end if;
  if p_user = auth.uid() then raise exception 'Non puoi rifiutare te stesso'; end if;
  update public.profiles set status = 'rejected', player_id = null, reviewed_at = now() where id = p_user;
end $$;

-- Elimina un utente registrato (account e profilo); il giocatore e le sue statistiche restano.
-- I voti già dati restano: sono legati al giocatore, non all'account.
create or replace function public.delete_user(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_admin() then raise exception 'Solo l''organizzatore può eliminare gli utenti'; end if;
  if p_user = auth.uid() then raise exception 'Non puoi eliminare il tuo account da qui'; end if;
  delete from public.profiles where id = p_user;
  delete from auth.users where id = p_user;
end $$;

revoke all on function public.approve_registration(uuid, public.user_role), public.reject_registration(uuid), public.delete_user(uuid) from public, anon;
grant execute on function public.approve_registration(uuid, public.user_role), public.reject_registration(uuid), public.delete_user(uuid) to authenticated;

notify pgrst, 'reload schema';
