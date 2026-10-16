---
name: Authentification des confirmations marchandes
description: Distinguer règlement local et acceptation de la notification par le marchand.
---

Un règlement SolvexPay réussi ne prouve pas que le marchand a accepté sa notification.

**Why:** Le récepteur Sika a rejeté des notifications `transaction.completed` avec HTTP 401, « Signature invalide. », alors que les opérations étaient correctement réglées. La clé marchande utilisée n’avait pas de secret de webhook partagé configuré.

**How to apply:** Vérifier séparément le crédit atomique et l’accusé de réception marchand. Sur 401 de signature, corriger le secret partagé et la signature attendue, sans désactiver la vérification côté marchand ni renvoyer des clés API au hasard. Réutiliser l’identifiant de transaction et ne jamais recréditer un paiement pour retenter sa notification. Ne pas annoncer les clients servis sur la seule base d’un règlement local ou d’un envoi HTTP.
