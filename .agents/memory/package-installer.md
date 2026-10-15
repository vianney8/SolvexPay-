---
name: Installation des dépendances importées
description: Contrainte du callback Replit lors de la restauration des dépendances d’un projet npm importé.
---

Le callback `installLanguagePackages` exige au moins un paquet dans `packages` ; une liste vide ne permet pas de réinstaller les dépendances déjà déclarées.

**Why:** La validation du runtime rejette une liste vide avant toute installation, même si le manifeste et le lockfile existent.

**How to apply:** Pour remettre en route un import npm sans changer de stack, demander l’installation d’un paquet déjà déclaré avec sa plage de version existante. Cela installe aussi les autres dépendances du projet.
