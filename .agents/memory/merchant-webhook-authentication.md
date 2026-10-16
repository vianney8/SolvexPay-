---
name: Authentification des confirmations marchandes
description: Distinguer règlement local et acceptation de la notification par le marchand.
---

Un règlement SolvexPay réussi ne prouve pas que le marchand a accepté sa notification.

**Why:** Le récepteur Sika a rejeté des notifications `transaction.completed` avec HTTP 401, « Signature invalide. », alors que les opérations étaient correctement réglées. La clé marchande utilisée n’avait pas de secret de webhook partagé configuré.

**How to apply:** Vérifier séparément le crédit atomique et l’accusé de réception marchand. Sur 401 de signature, corriger le secret partagé et la signature attendue, sans désactiver la vérification côté marchand ni renvoyer des clés API au hasard. Réutiliser l’identifiant de transaction et ne jamais recréditer un paiement pour retenter sa notification. Ne pas annoncer les clients servis sur la seule base d’un règlement local ou d’un envoi HTTP.

Le contrat de réception Sika utilise son secret `SOLVEXPAY_WEBHOOK_SECRET` et l’en-tête `x-solvexpay-signature`, contenant `sha256=` suivi du HMAC-SHA256 hexadécimal du corps JSON brut.

**Why:** Le récepteur strict refuse une signature absente avant tout traitement, y compris pour les anciens paiements.

**How to apply:** Faire configurer le même secret existant des deux côtés par le flux sécurisé, sans le lire depuis un dépôt ni l’afficher. Associer ce secret à la clé marchande concernée dans SolvexPay, puis retenter uniquement les confirmations non acceptées.

Après acceptation de la signature, Sika peut encore répondre `404 Payment not found`. Cela indique que son récepteur ne retrouve pas l’association avec le paiement local, et non que le paiement AlphaPay ou le crédit SolvexPay doit être recommencé.

**Why:** Une même régularisation peut avoir des notifications acceptées et un paiement restant introuvable chez le marchand.

**How to apply:** Conserver les accusés déjà obtenus et ne retenter que les notifications non acceptées. Examiner l’association côté Sika à partir de l’identifiant SolvexPay et d’une preuve du paiement local ; ne pas fabriquer une association sur le seul montant ou contourner les contrôles d’accès du récepteur.
