---
name: Audits SQL en lecture seule
description: Effet de configuration observé lors de lectures via le service SQL.
---

Après un audit SQL sans mutation métier, vérifier aussi les différences de
configuration du workspace.

**Why:** Des appels `executeSql` limités à des `SELECT` ont coïncidé avec
l’ajout automatique du module `postgresql-16` dans `.replit`, alors qu’aucun
changement de configuration n’était demandé.

**How to apply:** Distinguer lecture seule des données et absence de changement
du projet. Contrôler les différences avant livraison et ne pas conserver un
ajout de configuration non nécessaire à un audit. Ne pas annuler les
modifications indépendantes d’un autre intervenant.
