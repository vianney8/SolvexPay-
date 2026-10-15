---
name: Identité client AlphaPay
description: Écart entre les exemples simplifiés de la documentation REST et les contrats de données du SDK officiel.
---

Les encaissements directs AlphaPay exigent email, prénom, nom et téléphone. Les décaissements exigent également email, prénom et nom dans l’identité client ; le numéro du bénéficiaire est distinct.

**Why:** Les types du SDK officiel précisent que les exemples REST simplifiés, notamment ceux n’envoyant qu’un téléphone pour un retrait, ne décrivent pas tous les champs obligatoires.

**How to apply:** Lors d’une modification des parcours de paiement, vérifier le contrat du SDK et les validations effectives, pas seulement les exemples. Ne pas inventer d’identité ou d’adresse email pour contourner une validation.
