---
name: Exemptions et sorties manuelles
description: Limites des exemptions administrateur et périmètre du mode manuel.
---

L’exemption administrateur concerne uniquement la maintenance générale, jamais
les suspensions pays ou les maintenances opérateur et directionnelles.

**Why:** La demande d’uniformisation impose de conserver les restrictions
existantes et les seules exemptions administrateur voulues, sans ouvrir les
paiements.

**How to apply:** Ne pas interpréter une approbation administrateur comme une
autorisation de lever une restriction ou de forcer le succès fournisseur.

Le mode manuel doit concerner les retraits et les transferts Mobile Money.

**Why:** Les deux parcours envoient des fonds hors du portefeuille ; laisser
les transferts automatiques permettrait de contourner la validation manuelle.

**How to apply:** Tout nouveau parcours de sortie doit rester soumis à la même
décision humaine, sans confondre réservation, approbation, envoi et règlement.

Une consultation du statut ne doit jamais réémettre une sortie manuelle
soumise sans réponse fournisseur enregistrée, même avec la même clé
d’idempotence.

**Why:** La vérification peut arriver pendant l’appel initial ou après un
timeout ; elle ne doit pas devenir une deuxième source d’envoi accessible
depuis un point de vérification public.

**How to apply:** Conserver les fonds pour rapprochement en l’absence d’ID
fournisseur et tester le chevauchement entre approbation et vérification, pas
seulement les approbations concurrentes.
