#!/usr/bin/env bash
set -euo pipefail

rm -rf deploy-public
mkdir -p deploy-public

cp public/index.html public/agenda.json deploy-public/
cp evenement.html evenement-style.css evenement-script.js deploy-public/
cp prochain-jour.html jour.html jour.css prochain-jour.js jour.js pagination.js deploy-public/
cp ce-mois.html prochain-mois.html mois.css mois.js deploy-public/
cp evenements-lel.html evenements-lrl.html evenements-association.js deploy-public/
cp agenda-paysage-4.html agenda-paysage-6.html agenda-paysage.css agenda-association.js agenda-association.css deploy-public/
cp affiche.html affiche-carre-evenement.html affiche-carre-evenement.css affiche-facebook-evenement.html affiche-facebook-evenement.css deploy-public/
cp agenda-lel-affiche.html agenda-lel-carre.html agenda-lel-facebook.html agenda-lel-paysage-4.html agenda-lel-paysage-6.html deploy-public/
cp agenda-lrl-affiche.html agenda-lrl-carre.html agenda-lrl-facebook.html agenda-lrl-paysage-4.html agenda-lrl-paysage-6.html deploy-public/
cp -R img deploy-public/

echo "Fichiers publics préparés :"
find deploy-public -type f | sort
