---
name: Succès AlphaPay et frais déduits
description: Distinguer paiement réussi, net fournisseur et montant à créditer sur le portefeuille.
---

Un encaissement AlphaPay en mode `DEDUCTED` peut être `SUCCESS` avec un net inférieur au montant demandé : les frais sont prélevés sur ce montant. Cet écart ne signifie pas que le client n’a pas payé.

**Why:** Le contrôle d’un net fournisseur contre le montant brut promis par SolvexPay peut bloquer des paiements réellement réussis lorsque les frais SolvexPay sont nuls ou inférieurs aux frais AlphaPay.

**How to apply:** Vérifier séparément l’identité de l’opération, le sens, la devise, le montant demandé et le statut fournisseur. Rapprocher ensuite les frais et le net avec la règle commerciale explicitement choisie pour le crédit du portefeuille. Ne pas simplement supprimer les contrôles ni créditer arbitrairement le brut ; une décision sur qui supporte les frais est nécessaire. Pour un audit, lire directement les ressources AlphaPay et la base en transaction SQL `READ ONLY` : ne pas appeler les méthodes applicatives de vérification qui peuvent régler et créditer une opération.
