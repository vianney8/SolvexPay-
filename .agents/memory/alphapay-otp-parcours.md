---
name: Parcours et codes AlphaPay
description: Correction utilisateur sur la vérification des véritables formulaires AlphaPay et des codes demandés avant paiement.
---

Vérifier le véritable formulaire AlphaPay avec des coordonnées fictives avant d’annoncer les opérateurs et les étapes proposées à l’utilisateur.

**Why:** L’utilisateur a signalé que la comparaison du catalogue général ne répondait pas à sa demande : il fallait suivre le lien hébergé et examiner les formulaires propres aux pays et opérateurs.

**How to apply:** Séparer ce qui est observé dans le formulaire de ce qui nécessite une initiation réelle. Les sélections et renseignements fictifs ne doivent pas conduire à soumettre un paiement, demander un SMS ou utiliser les coordonnées d’un utilisateur.

Les codes préalables Orange ne sont pas équivalents à une confirmation SMS après initiation.

**Why:** Le formulaire hébergé examiné demande un code obligatoire avant paiement pour Orange Côte d’Ivoire et Orange Burkina Faso, alors que les champs SolvexPay étaient présentés comme facultatifs. En Côte d’Ivoire, l’instruction observée est de composer #144*82#, puis l’option 2. Au Burkina Faso, l’instruction utilise *144*4*6*{amount}#, avec le total réellement débité, frais fournisseur compris.

**How to apply:** Vérifier les instructions et exigences actuelles du parcours correspondant avant de modifier les formulaires ; ne pas réutiliser mécaniquement une règle de confirmation après initiation ou le montant hors frais. L’absence de code dans le formulaire initial ne prouve pas l’absence de validation ultérieure ou de redirection.

La disponibilité et les consignes doivent être lues dans les tarifs propres au marchand, séparément pour les entrées et sorties.

**Why:** Le catalogue des réseaux actifs comporte des réseaux absents du checkout réel. Les exigences de code peuvent changer avec la route prioritaire sans modification côté SolvexPay.

**How to apply:** Consulter /pricing/my-rates/ plutôt que déduire les capacités d’un simple is_active. Les taux de change AlphaPay peuvent ne fournir qu’un sens pour une paire ; utiliser l’inverse du taux officiel lorsqu’il est fourni, jamais une constante supposée.

Pour les encaissements Orange, imposer le code préalable au Burkina Faso et ne pas le demander au Sénégal ; les autres réseaux gardent leurs règles dynamiques.

**Why:** L’utilisateur a explicitement demandé ces deux exceptions le 19 octobre 2026, indépendamment du drapeau renvoyé dans les tarifs.

**How to apply:** Appliquer la même règle aux devis affichés et à la validation serveur. Garder le montant total frais compris dans les instructions Burkina Faso ; ne pas étendre cette exigence aux retraits.
