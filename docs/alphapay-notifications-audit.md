# Vérification des notifications AlphaPay

Audit du 15 octobre 2026. Aucun paiement, décaissement, crédit réel, changement
de configuration AlphaPay ou rejeu de livraison n’a été demandé par cet audit.

## Résultat : activation non validée

La configuration distante bloque la réception des notifications. Les tests
simulés valident les protections applicatives, **pas une livraison signée
AlphaPay de bout en bout en production**.

### Constats en lecture seule

- Les métadonnées de publication confirment `https://solvexpay.com` comme URL
  principale, publication publique, build réussi. Autre domaine publié :
  `https://solvex-pay-topwin.replit.app`. Revérifier ces informations avec la
  compétence deployment avant une intervention ultérieure.
- Le SDK officiel `webhookEndpoints.list()` renvoie un endpoint **LIVE actif**
  à `https://solvexpay.com/api/webhook`, sans restriction à un lien de paiement.
- Ses abonnements sont `transaction.success`, `transaction.failed`,
  `transaction.cancelled` et `transaction.created`.
- Les journaux de production montrent des `POST /api/webhook` en **404**.
  Les cinq livraisons récentes consultées côté AlphaPay portent également un
  statut HTTP 404 et sont en cours de nouvelle tentative.
- Les enveloppes AlphaPay ont les clés `event` et `data` ; `data.id` est présent.
  Les valeurs clients et les corps complets n’ont pas été conservés dans ce rapport.
- L’existence de `ALPHAPAY_SECRET_KEY` et `ALPHAPAY_WEBHOOK_SECRET` en production
  est confirmée, sans lecture ni affichage de leurs valeurs.
  Cela ne prouve pas que le secret de signature correspond à celui d’AlphaPay.
- Le récepteur applicatif est exclusivement
  **`POST https://solvexpay.com/api/webhooks/alphapay`**.
  Aucun alias `/api/webhook` n’a été ajouté.
- Le SDK permet de lire endpoints, abonnements et journaux, mais documente les
  modifications et rejeux comme réservés au tableau de bord AlphaPay.
  Aucune écriture distante n’a été tentée.

## Intervention nécessaire avant ouverture

1. Le titulaire doit modifier l’URL du webhook existant dans AlphaPay en
   `https://solvexpay.com/api/webhooks/alphapay`, conserver les abonnements de
   succès/échec/annulation et ne pas faire tourner le secret inutilement.
2. Confirmer que le secret de cet endpoint est celui configuré en production
   dans `ALPHAPAY_WEBHOOK_SECRET`, sans l’envoyer dans le chat.
3. Faire livrer un événement **`webhook.test` signé** et contrôler un HTTP 200
   et `{ "received": true }`. Ce type d’événement n’effectue aucun règlement.
   Une requête non signée doit rester rejetée, même après correction de l’URL.
4. Ne relivrer aucun événement de transaction réel ni appeler une vérification
   de paiement réel sans autorisation explicite : ces opérations peuvent créditer
   un portefeuille ou, en cas d’initiation incertaine, réessayer une demande.
   Une ouverture du site ou un retour navigateur ne constitue pas cette autorisation.
5. Après autorisation, rapprocher les opérations en attente et les livraisons
   épuisées à partir des références persistées, sans marquage manuel de succès.

Les modifications de code de cette branche ne sont pas publiées par cet audit.
La simple correction de l’URL ne prouve pas que tous les paiements historiques
ont été rapprochés.

## Chaîne de confiance et règlement

- `server/index.ts` conserve le corps JSON brut.
- `server/services/paymentNotifications.ts` valide HMAC-SHA256 sur
  `timestamp + "." + corps brut`, avec une tolérance de cinq minutes.
  Un test signé est acquitté sans paiement. Un événement de transaction sert
  uniquement à déclencher une vérification, jamais à imposer un statut.
- `referenceForWebhook()` dans `server/services/paymentService.ts` cherche
  `data.id` dans les IDs fournisseur enregistrés ; une référence locale reçue
  dans le payload ne peut pas substituer cette liaison.
  Les anciens checkouts sont vérifiés à partir de leurs liaisons persistées.
- `getStatus()` consulte le endpoint AlphaPay `verify` authentifié et contrôle
  l’ID, le montant demandé, la devise, le sens et le net disponible.
  Le montant et la devise de l’écriture locale doivent également correspondre
  à l’intention sauvegardée.
- Pour crypto, le montant fournisseur est en USD, tandis que le montant source
  et les frais locaux restent utilisés pour le crédit XOF/XAF/CDF converti
  dans le portefeuille XOF. Un montant source incohérent bloque le règlement.
- `settlePayment()` verrouille la transaction avec `FOR UPDATE`, ne traite que
  `pending`, puis met à jour portefeuille et statut dans la même transaction SQL.
  La notification de règlement intervient après validation comptable.
- Le retour `/api/payment/callback` ne contient plus de second chemin de crédit :
  il appelle le même service vérifié et redirige uniquement vers la page interne.
  `status`, `amount` et `merchant_redirect` fournis par le navigateur ne prouvent rien.
- Le retour `/api/v1/sr/wave-callback` exige que l’identifiant local et la référence
  désignent la même transaction avant toute vérification. Il n’écrit ni statut
  ni solde indépendamment du service. Associer la référence d’un paiement A
  terminé à l’identifiant d’un dépôt B en attente renvoie 404 sans créditer B.

## Validation locale reproductible

```sh
npm run test:payments
npm run check
npm run build
```

Les 36 tests passent. Les nouveaux scénarios utilisent les vrais handlers HTTP,
le vrai service de rapprochement et les vraies règles comptables, avec
**transport AlphaPay simulé, clé synthétique et base en mémoire**. Ils couvrent :

- signature valide, invalide, absente, expirée et corps altéré ;
- événement signé sans correspondance, référence locale falsifiée, ID manquant ;
- statut fournisseur pending/failed/cancelled et erreur de vérification ;
- incohérences d’ID, montant, devise, sens, net et écriture locale ;
- factures crypto USD et crédits sources XOF, XAF, CDF, conversions incohérentes ;
- doublons HTTP concurrents et concurrence webhook/retour navigateur ;
- annulation simulée du crédit si l’écriture du statut échoue, puis retry unique ;
- faux succès navigateur et redirection marchande malveillante ;
- retour Wave avec référence réussie et autre identifiant en attente, paramètres
  absents ou répétés, concurrence entre les deux retours navigateur et le webhook ;
- absence de l’ancien endpoint non signé.

**Limites :** les verrous et annulations PostgreSQL réels restent à éprouver sur
une base de test isolée. La suite ne remplace pas un contrôle signé de bout en bout
après correction dans AlphaPay. La compilation et TypeScript passent ;
les avertissements Vite sur la taille des bundles et Browserslist ne sont pas
des erreurs bloquantes.

L’aperçu applicatif n’était pas démarré (connexion refusée lors de la capture).
Il n’a pas été lancé pour cet audit : le démarrage effectue des écritures
d’initialisation et démarre un rapprochement automatique des paiements après
30 secondes, ce qui n’est pas un test sans effets sur les données existantes.
Les handlers modifiés ont été vérifiés via le serveur HTTP isolé de la suite ;
l’interface connectée n’a pas été vérifiée visuellement.
