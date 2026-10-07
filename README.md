# Compte Boost

Logiciel de contrôle des boosts par page : saisie horodatée par les employés, écart entre messages des boosts et messages réels, comparaison sur 3 jours, récapitulatifs (jour, semaine, mois, année), calendrier, validation par l'administrateur.

## Adresse

https://randnjara.github.io/CompteBoost/

## Où sont enregistrées les données

Dans la feuille Google de l'administrateur, grâce au script `apps-script/Code.gs` (onglets `CB_pages`, `CB_membres`, `CB_saisies`, `CB_validations`). La date et l'heure de chaque saisie viennent de l'horloge de Google.

La première fois, l'administrateur ouvre l'adresse ci-dessus : la page affiche les 6 étapes pour brancher la feuille Google. Ensuite, chaque employé reçoit son propre lien d'accès depuis l'onglet « Pages et équipe ».
