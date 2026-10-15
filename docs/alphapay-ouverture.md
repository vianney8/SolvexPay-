# AlphaPay — contrôle préalable à l’ouverture

Contrôle du 15 octobre 2026, réalisé uniquement en lecture.

## Décision

**Ne pas ouvrir les retraits. Ne pas lever la maintenance générale à ce stade.**

Les décaissements sont bloqués par une whitelist IP vide et des soldes pays
nuls. Les droits de la clé et l’activation des décaissements ne sont pas
confirmés. Des écarts d’application des restrictions existent aussi dans le
code : conserver les réglages ne garantit pas leur respect sur chaque route.

Aucune restriction, whitelist, clé, donnée métier ou configuration de paiement
n’a été modifiée. Aucun paiement, demande de code, transfert de fonds ou
rapprochement modifiant les portefeuilles n’a été déclenché.

## Périmètre et preuves

- Réglages : lectures SQL `SELECT` de la base **de développement**, limitées
  aux réglages de maintenance, pays suspendus, mode de retrait et méthodes.
  Aucune conclusion sur les réglages de la base de production.
- Fournisseur : requêtes GET authentifiées avec la clé configurée dans cet
  environnement ; le SDK indique le mode **live**. Il ne s’agit donc pas
  d’un constat de sandbox. Secrets consommés uniquement par le SDK, jamais
  affichés. Le mode live du fournisseur ne signifie pas que la base locale
  ou l’IP observée sont celles de l’application publiée.
- `GET /pricing/my-rates/` : disponibilités, limites, frais et exigences OTP.
- `client.balances.list({page_size: 100})` : 28 soldes, aucune page suivante.
- `client.apiKeys.ipWhitelist.list({page_size: 100})` : zéro entrée,
  aucune page suivante. Il s’agit d’une vraie liste vide, pas d’un échec réseau.
- `client.apiKeys.list({page_size: 1})` : HTTP 403, `dashboard_only`.
  Impossible d’en déduire les droits PAYIN/PAYOUT de la clé en cours.
- IP sortante observée depuis cet espace de travail : `136.117.233.11`
  (lecture de `https://api.ipify.org?format=json`). Cette mesure n’atteste ni
  l’IP de production ni sa stabilité. Aucune adresse n’a été ajoutée.
- Présence des secrets API et webhook confirmée sans lecture de leurs valeurs.
  Leur présence ne valide ni la livraison des webhooks ni la concordance du
  secret de signature avec le fournisseur.

Ces résultats sont un instantané, pas une autorisation de mise en service.
Les lectures doivent être refaites dans l’environnement réellement visé avant
toute ouverture.

## Conditions opérationnelles

| Condition | Résultat | Conséquence |
| --- | --- | --- |
| Authentification des lectures API | Soldes, tarifs et whitelist lisibles | Accès de lecture fonctionnel ; ne prouve pas les permissions de création |
| Autorisation PAYIN de la clé utilisée | Non vérifiable par la liste des clés, réservée au dashboard | Faire confirmer le scope de cette clé : PAYIN ou BOTH pour les entrées |
| Autorisation PAYOUT de la clé utilisée | Même limite de lecture | Faire confirmer PAYOUT ou BOTH avant les sorties |
| Activation marchand des décaissements et KYC AlphaPay | Non confirmés par les lectures disponibles | Faire vérifier explicitement ces deux points dans le dashboard AlphaPay |
| IP autorisée pour les sorties | Whitelist vide | Aucun serveur n’est actuellement autorisé par cette liste |
| Sortie réseau durable du serveur cible | Non établie | Ne pas considérer l’IP ponctuelle du workspace comme une solution durable |
| Solde disponible par pays/devise | Zéro dans les neuf pays du produit | Aucun retrait positif n’est finançable, même avant les frais |
| Mode de frais | ADD_ON dans les tranches consultées | Compatible avec les requêtes actuelles ; ne lève aucun autre blocage |
| Crypto | PAYIN disponible, PAYOUT indisponible | Encaissement seulement, sans exception |

L’état `available` d’un tarif est distinct du scope de la clé, du KYC,
de l’activation des décaissements, de l’autorisation IP et du financement.
Ne pas présenter un de ces états comme preuve des autres.

### Soldes concernés

| Pays SolvexPay | Pays AlphaPay | Devise | Disponible | En attente |
| --- | --- | --- | ---: | ---: |
| BJ | BJ | XOF | 0 | 0 |
| CI | CI | XOF | 0 | 0 |
| BF | BF | XOF | 0 | 0 |
| TG | TG | XOF | 0 | 0 |
| SN | SN | XOF | 0 | 0 |
| ML | ML | XOF | 0 | 0 |
| CM | CM | XAF | 0 | 0 |
| COD | CD | CDF | 0 | 0 |
| COG | CG | XAF | 0 | 0 |

Le solde crypto XX/USD est également nul ; un solde nul ne constitue pas,
à lui seul, un blocage d’encaissement. Le blocage de liquidité décrit ici
concerne les sorties. Un éventuel approvisionnement ou transfert entre pays
est une opération financière distincte, non autorisée par ce contrôle.

### Disponibilités propres au marchand

Les 25 couples Mobile Money proposés par le catalogue produit ont chacun
un tarif PAYIN et PAYOUT disponible :

| Pays | Opérateurs du produit retrouvés dans les tarifs |
| --- | --- |
| BJ | MTN, Moov, Celtiis |
| CI | Orange, MTN, Moov, Wave |
| BF | Moov, Orange |
| TG | TMoney (`togocel`), Moov |
| SN | Orange, Wave, Free (`freemoney_sn`), Expresso |
| ML | Orange, Moov, Wave |
| CM | MTN, Orange |
| COD/CD | Vodacom, Airtel, Orange |
| COG/CG | MTN, Airtel |

Cela ne réactive aucune méthode suspendue localement. Les méthodes historiques
présentes en base mais hors du catalogue produit ne sont pas une extension
autorisée du périmètre.

La plupart des tranches Mobile Money vont de 200 à 100 000 000 unités locales.
Exceptions observées : plafond PAYOUT Celtiis BJ de 50 000 000 ; minimum
PAYOUT Moov ML de 0 ; minimum PAYIN/PAYOUT Wave ML de 0.
L’application exige néanmoins un montant entier strictement positif.
Vérifier la tranche du devis au montant réel : ne pas prendre ces plafonds
fournisseur comme des limites opérationnelles approuvées pour le produit.

Crypto : tarif entrant XX/USD de 1 à 50 000 USD, aucun tarif sortant.
Le montant source doit être converti avec les taux AlphaPay et respecter la
tranche USD ; aucun retrait crypto ne doit être ajouté.

Codes préalables obligatoires pour les entrées Orange CI et BF :
- CI : `#144*82#`, puis option 2.
- BF : `*144*4*6*{amount}#`, avec le total fournisseur, frais compris.

## Restrictions administrateur conservées

| Réglage | Valeur constatée | Effet prévu / limite constatée |
| --- | --- | --- |
| Maintenance générale | `true` | Bloque les routes utilisant `requireNotMaintenance`, sauf comptes administrateurs |
| Pays suspendus | `["COG"]` | Contrôlé dans les branches de paiement direct de l’API ; couverture non uniforme ailleurs |
| Mode retrait | `manual` | Enregistré et affiché, mais non utilisé pour différer l’envoi dans le parcours actuel de retrait |
| Dépôts Orange | CI | Maintenance spécifique au pays |
| Retraits Orange | Globale + COD dans la liste pays | La maintenance globale couvre tous ses pays, pas seulement COD |
| Retraits Moov | BJ, CI, BF, ML | TG n’est pas dans cette restriction |
| Retraits Free | Globale | Concerne Free au Sénégal dans le catalogue actuel |
| Retraits TMoney | Globale | Concerne le réseau `togocel` au Togo |

Les méthodes lues ont `is_active=true` ; aucune maintenance opérateur générale
(`in_maintenance`) n’est activée. Les restrictions directionnelles ci-dessus
sont néanmoins actives et doivent être préservées individuellement.

## Examen du code : risques avant ouverture

### `server/routes.ts`

- `requireNotMaintenance` renvoie 503 sur les routes auxquelles il est attaché,
  avec exemption des administrateurs.
- `/api/v1/deposit` n’emploie pas ce garde de maintenance générale. Sa branche
  SR peut initier directement un encaissement ; le réglage général ne doit donc
  pas être présenté comme un arrêt exhaustif de toutes les initiations.
- La suspension de pays est contrôlée dans la branche directe de
  `/api/v1/deposit` et dans `/api/v1/sr/pay`, mais pas dans les parcours
  dépôt du tableau de bord, paiement public, lien public, retrait et transfert.
- Le retrait contrôle ses maintenances spécifiques, mais ne passe pas par
  le contrôle commun `checkOperatorMaintenance` (désactivation et maintenance
  générale d’un opérateur).
- Le transfert vers Mobile Money passe par `reservePayout` sans contrôle local
  de suspension pays ou de maintenance opérateur/retrait.
- Le mode `withdrawalMode` est lu/écrit par les routes d’administration, mais
  n’est pas consulté par le parcours de retrait avant `reservePayout`.
  **Le mode manuel ne garantit donc pas une validation humaine avant envoi.**
- Aucun de ces écarts n’a été corrigé dans cet audit en lecture seule.

### `server/services/alphapay.ts`

- Initie les entrées avec Softpay et les sorties avec `/payouts/initialize/`.
- Les requêtes de paiement utilisent `fee_charge_mode: "ADD_ON"`.
- Les sorties crypto sont explicitement refusées.
- `getBalance` parcourt les soldes pays ; lire ces soldes ne constitue pas
  une autorisation ni une réservation de liquidité.

### `server/services/paymentQuote.ts` et orchestration

- Le devis exige une disponibilité pour le sens demandé, une tranche de
  montant/devise valide et refuse les sorties crypto.
- Les tarifs sont mis en cache 60 secondes ; le change crypto 5 minutes.
- Le devis ne vérifie pas les permissions de la clé, l’activation des sorties,
  la whitelist ou le solde pays.
- Dans `server/services/paymentService.ts`, `reservePayout` réserve atomiquement
  le portefeuille utilisateur, puis lance la sortie. Cette réserve locale
  n’est pas un contrôle du solde marchand AlphaPay.
- Il n’existe donc pas de feu vert opérationnel complet déductible du seul
  devis ou du solde du portefeuille utilisateur.

## Conditions à réunir avant une décision d’ouverture

1. Faire confirmer en lecture dans le dashboard AlphaPay le scope de la clé
   effectivement utilisée, sa validité, le KYC marchand et l’activation des
   décaissements. Ne pas créer, remplacer ou élargir une clé pendant ce contrôle.
2. Définir une sortie réseau durable pour le serveur cible, puis demander
   l’accord explicite avant toute modification de whitelist. Relire ensuite
   la liste et vérifier la correspondance avec la sortie effective.
3. Définir les montants/volumes à servir et les frais ; demander un accord
   distinct avant tout approvisionnement. Vérifier ensuite le disponible de
   chaque pays/devise, sans compter les fonds en attente ni supposer qu’un
   autre pays peut financer automatiquement la sortie.
4. Uniformiser les gardes serveur et rendre le mode manuel effectif avant
   de se fier aux protections pour une ouverture progressive. Les corrections
   doivent conserver les restrictions existantes et être testées sans paiement.
5. Terminer séparément la vérification du crédit automatique et du traitement
   des confirmations AlphaPay avant une ouverture des encaissements.
6. Soumettre une proposition précise pays/opérateur/sens à l’administrateur.
   Une permission de préparer ou contrôler ne vaut pas permission de lever
   la maintenance générale, la suspension COG ou une maintenance opérateur.
7. Après accord explicite seulement, appliquer les seules ouvertures approuvées
   et contrôler leur effet. Tout essai avec mouvement réel exige lui aussi
   une autorisation distincte. La crypto reste exclusivement entrante.

## Limites de vérification

Audit statique des parcours et lectures fournisseur/SQL réussies, sans essais
d’initiation. L’aperçu de développement répondait HTTP 502 lors du contrôle :
aucune interface ni page authentifiée n’a été validée visuellement.
L’application n’a pas été démarrée pour cet audit afin de ne pas provoquer
ses traitements de démarrage ou de rapprochement en arrière-plan.
