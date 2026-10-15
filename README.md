# Compte Boost

Logiciel de contrôle des boosts par page : saisie horodatée par les employés, écart entre messages des boosts et messages réels, comparaison sur 3 jours, récapitulatifs (jour, semaine, mois, année), calendrier, validation par l'administrateur.

## Adresse

https://randnjara.github.io/CompteBoost/

## Où sont enregistrées les données

Dans la feuille Google de l'administrateur, grâce au script `apps-script/Code.gs` (onglets `CB_pages`, `CB_membres`, `CB_saisies`, `CB_validations`). La date et l'heure de chaque saisie viennent de l'horloge de Google.

La première fois, l'administrateur ouvre l'adresse ci-dessus : la page affiche les 6 étapes pour brancher la feuille Google. Ensuite, chaque employé reçoit son propre lien d'accès depuis l'onglet « Pages et équipe ».

## Gestock FB (ventes, paiements, stocks par page)

Adresse : https://randnjara.github.io/CompteBoost/gestock/ (démonstration avec données fictives : `gestock/?demo=1`).

Même connexion et même base que Compte Boost. Gestock lit les pages Facebook et les employés de Compte Boost sans les modifier, et range ses propres données à part (`gs_commandes`, `gs_paiements`, `gs_versements`, `gs_produits`, `gs_mouvements`, `gs_depenses`, `gs_journal`…).

Pour que les vendeurs puissent enregistrer eux-mêmes leurs commandes, coller une fois `supabase/gestock.sql` dans Supabase (SQL Editor → Run). L'administrateur n'en a pas besoin.
