-- Compte Boost : base de données (à coller une seule fois dans Supabase → SQL Editor → Run)

-- 1. Tables
create table if not exists public.docs (
  path    text primary key,
  parent  text not null default '',
  data    jsonb not null default '{}'::jsonb,
  auteur  uuid default auth.uid(),
  cree_le timestamptz not null default now(),
  maj_le  timestamptz not null default now()
);
create index if not exists docs_parent_idx on public.docs(parent);

create table if not exists public.profils (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role    text not null check (role in ('admin','employe')),
  code    text unique,
  nom     text,
  cree_le timestamptz not null default now()
);

-- 2. Fonctions d'accès
create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profils where user_id = auth.uid() and role = 'admin')
$$;

create or replace function public.est_membre() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profils where user_id = auth.uid())
$$;

create or replace function public.mon_code() returns text
language sql stable security definer set search_path = public as $$
  select code from profils where user_id = auth.uid()
$$;

-- Heure officielle : celle du serveur
create or replace function public.heure_serveur() returns timestamptz
language sql stable as $$ select now() $$;

create or replace function public.iso_now() returns text
language sql stable as $$ select to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $$;

-- Le premier compte qui le demande devient administrateur (une seule fois)
create or replace function public.devenir_admin() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from profils where role = 'admin') then
    return exists (select 1 from profils where user_id = auth.uid() and role = 'admin');
  end if;
  insert into profils(user_id, role, nom) values (auth.uid(), 'admin', 'Administrateur')
  on conflict (user_id) do update set role = 'admin', code = null;
  return true;
end $$;

-- Un employé peut écrire : sa fiche, ses brouillons/demandes, et les jours/boosts de SES pages
create or replace function public.ecriture_permise(p text, d jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare c text; pid text; resp text;
begin
  if est_admin() then return true; end if;
  if auth.uid() is null or not est_membre() then return false; end if;
  if p = 'membres/' || auth.uid()::text then return true; end if;
  if p like 'saisies/' || auth.uid()::text || '/%' then return true; end if;
  if p like 'jours/%' or p like 'boosts/%' then
    c := mon_code();
    pid := d->>'pageId';
    if c is null or pid is null then return false; end if;
    if p like 'jours/%' and p <> 'jours/' || pid || '_' || (d->>'date') then return false; end if;
    if p like 'boosts/%' and p <> 'boosts/' || pid then return false; end if;
    select data->>'responsable' into resp from docs where path = 'pages/' || pid;
    return resp = 'inv_' || c;
  end if;
  return false;
end $$;

-- 3. Règles de sécurité (RLS)
alter table public.docs enable row level security;
alter table public.profils enable row level security;

drop policy if exists lire on public.docs;
create policy lire on public.docs for select to authenticated using (est_membre());
drop policy if exists creer on public.docs;
create policy creer on public.docs for insert to authenticated with check (ecriture_permise(path, data));
drop policy if exists modifier on public.docs;
create policy modifier on public.docs for update to authenticated
  using (ecriture_permise(path, data)) with check (ecriture_permise(path, data));
drop policy if exists supprimer on public.docs;
create policy supprimer on public.docs for delete to authenticated
  using (est_admin() or path like 'saisies/' || auth.uid()::text || '/%');

drop policy if exists lire_profils on public.profils;
create policy lire_profils on public.profils for select to authenticated using (est_membre());

-- 4. Contrôles côté serveur : heure du serveur, jours verrouillés, auteur réel
create or replace function public.avant_ecriture() returns trigger
language plpgsql security definer set search_path = public as $$
declare adm boolean := est_admin();
begin
  new.parent := regexp_replace(new.path, '/[^/]*$', '');
  new.maj_le := now();
  if tg_op = 'UPDATE' then
    new.cree_le := old.cree_le;
    new.auteur := old.auteur;
  else
    new.cree_le := now();
    new.auteur := auth.uid();
  end if;
  if new.path like 'jours/%' then
    if not adm then
      if tg_op = 'UPDATE' and coalesce(old.data->>'statut','') in ('enregistre','rectifie') then
        raise exception 'Ce jour est déjà enregistré : seul l''administrateur peut le rectifier.';
      end if;
      new.data := new.data || jsonb_build_object('auteur', auth.uid()::text, 'enregistreLe', iso_now());
    elsif tg_op = 'UPDATE' and jsonb_array_length(coalesce(new.data->'rectifs','[]'::jsonb)) > jsonb_array_length(coalesce(old.data->'rectifs','[]'::jsonb)) then
      -- rectification : heure du serveur, valeurs d'origine conservées
      new.data := jsonb_set(new.data, array['rectifs', (jsonb_array_length(new.data->'rectifs') - 1)::text, 'le'], to_jsonb(iso_now()));
      new.data := new.data || jsonb_build_object('enregistreLe', old.data->'enregistreLe', 'auteur', old.data->'auteur');
    end if;
  end if;
  if new.path = 'membres/' || coalesce(auth.uid()::text,'-') and not adm then
    new.data := new.data || jsonb_build_object('invitation', mon_code());
  end if;
  if new.path like 'saisies/%/brouillons/%' then
    new.data := new.data || jsonb_build_object('majLe', iso_now());
  end if;
  if new.path like 'saisies/%/entrees/%' or new.path like 'saisies/%/demandes/%' then
    if tg_op = 'INSERT' then new.data := new.data || jsonb_build_object('serveurLe', iso_now()); end if;
  end if;
  return new;
end $$;
drop trigger if exists docs_avant on public.docs;
create trigger docs_avant before insert or update on public.docs
  for each row execute function public.avant_ecriture();

-- Fusion d'un document (update partiel)
create or replace function public.fusion(p text, patch jsonb) returns void
language sql security invoker set search_path = public as $$
  insert into docs(path, data) values (p, patch)
  on conflict (path) do update set data = docs.data || excluded.data;
$$;

-- 5. Comptes employés : identifiant = code (ex. ANJA6585), créés par l'administrateur dans l'application
create or replace function public.nouveau_compte() returns trigger
language plpgsql security definer set search_path = public as $$
declare c text; m jsonb;
begin
  if new.email like '%@compteboost.app' then
    c := upper(split_part(new.email, '@', 1));
    select data into m from docs where path = 'membres/inv_' || c;
    if m is not null and coalesce((m->>'ouvert')::boolean, false)
       and not exists (select 1 from profils where code = c) then
      insert into profils(user_id, role, code, nom) values (new.id, 'employe', c, m->>'nom');
      update docs set data = (data - 'ouvert') || jsonb_build_object('compte', true, 'compteLe', iso_now()) where path = 'membres/inv_' || c;
      insert into docs(path, parent, data, auteur) values ('membres/' || new.id::text, 'membres',
        jsonb_build_object('invitation', c, 'codeLe', iso_now()), new.id)
      on conflict (path) do update set data = docs.data || excluded.data;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists compte_cree on auth.users;
create trigger compte_cree after insert on auth.users
  for each row execute function public.nouveau_compte();

-- Nouveau mot de passe pour un employé (administrateur seulement)
create or replace function public.changer_mot_de_passe(code_employe text, mot_de_passe text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not est_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  if length(coalesce(mot_de_passe,'')) < 6 then raise exception 'Le mot de passe doit avoir au moins 6 caractères.'; end if;
  update auth.users set encrypted_password = crypt(mot_de_passe, gen_salt('bf')), updated_at = now()
   where email = lower(code_employe) || '@compteboost.app';
  return found;
end $$;

-- 6. Mises à jour en direct
alter table public.docs replica identity full;
do $$ begin
  begin alter publication supabase_realtime add table public.docs; exception when others then null; end;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.docs to authenticated;
grant select on public.profils to authenticated;
grant execute on function public.heure_serveur, public.devenir_admin, public.fusion(text, jsonb), public.est_admin, public.est_membre, public.mon_code, public.changer_mot_de_passe(text, text) to authenticated;
