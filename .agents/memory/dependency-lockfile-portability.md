---
name: Portabilité des dépendances
description: Garder les références du lockfile npm utilisables hors de l’environnement Replit.
---

Les lockfiles partagés avec un hébergeur externe doivent utiliser des URL d’archives npm publiques et conserver leurs contrôles d’intégrité.

**Why:** Une installation depuis Replit peut enregistrer des URL de registre internes que Render ne peut pas résoudre, ce qui bloque l’installation avant même la compilation.

**How to apply:** Après une modification des dépendances destinée à un déploiement externe, rechercher les hôtes internes dans le lockfile. Ne remplacer une URL que si l’archive publique de la même version possède exactement l’intégrité enregistrée. Ne pas modifier les versions, supprimer les contrôles d’intégrité ni contourner un blocage de sécurité.
