---
name: Consultation des IP AlphaPay
description: Éviter un faux diagnostic lors de la vérification des IP autorisées pour les payouts.
---

Pour consulter les IP autorisées, utiliser la méthode de lecture `apiKeys.ipWhitelist.list` du SDK officiel. Ne pas déduire une route GET à partir de l’URL de création indiquée dans un exemple.

**Why:** Une lecture sur une URL supposée a répondu 404 alors que la méthode de liste du SDK fonctionnait avec la même configuration. Un échec de lecture ne permet donc pas de conclure qu’aucune IP n’est autorisée.

**How to apply:** Distinguer une liste vide réellement reçue d’une vérification impossible. Consulter les IP est une opération en lecture seule ; en ajouter ou en modifier exige une décision explicite, car cela change les autorisations de décaissement.
