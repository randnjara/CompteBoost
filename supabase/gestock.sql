-- Gestock FB : accès des employés (vendeurs) aux données de Gestock.
-- À coller UNE fois dans Supabase → SQL Editor → Run, seulement quand les vendeurs doivent saisir eux-mêmes.
-- Ne supprime et ne modifie aucune donnée : la règle d'écriture reste identique pour Compte Boost,
-- on ajoute seulement les collections gs_… de Gestock (l'administrateur y a déjà accès sans ce fichier).

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
  -- Gestock : journal des actions (tout membre)
  if p like 'gs\_journal/%' then return true; end if;
  -- Gestock : commandes, paiements, mouvements de stock et clients des pages dont l'employé est responsable
  if p like 'gs\_commandes/%' or p like 'gs\_paiements/%' or p like 'gs\_mouvements/%' or p like 'gs\_clients/%' then
    c := mon_code();
    pid := d->>'pageId';
    if c is null or pid is null then return false; end if;
    select data->>'responsable' into resp from docs where path = 'pages/' || pid;
    return resp = 'inv_' || c;
  end if;
  return false;
end $$;
