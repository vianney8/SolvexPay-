# Gardes de paiement et validation manuelle

Les constats de `alphapay-ouverture.md` restent un instantané en lecture seule.
La correction des gardes ne constitue pas une autorisation d’ouverture et ne
modifie aucun réglage, pays suspendu, maintenance opérateur ou droit AlphaPay.

## Contrôles communs

- La maintenance générale bloque les initiations du tableau de bord, les
  retraits et transferts, les paiements publics, les liens, les deux variantes
  de l’API dépôt, le paiement SR et la création d’intention par checkout.
- Seule une session administrateur authentifiée bénéficie de l’exemption
  de maintenance générale. Une clé de marchand administrateur ou un champ
  envoyé dans le formulaire ne donne pas cette exemption.
- Pays suspendus, opérateurs désactivés, maintenance opérateur générale et
  par pays, et maintenance directionnelle s’appliquent aussi aux administrateurs.
  Les alias CG/COG et CD/COD sont normalisés.
- Une erreur de lecture des restrictions bloque une nouvelle initiation.
  Le service revérifie les restrictions avant l’envoi, y compris avant une
  reprise d’intention sans réponse fournisseur. Une vérification d’un ID
  fournisseur déjà reçu reste possible pour régler les opérations engagées.
- La crypto reste exclusivement entrante. Le pays source est conservé avant
  conversion USD afin d’appliquer ses restrictions aux reprises.

## Retraits et transferts en mode manuel

Le mode manuel s’applique aux deux types de sortie pour ne pas permettre un
contournement par transfert.

1. Validation des paramètres, restrictions et devis.
2. Réservation atomique du principal et des frais XOF, avec création de
   l’opération en attente et de sa demande d’approbation persistante dans la
   même transaction SQL. Aucun binding ni envoi fournisseur à ce stade.
3. La liste d’administration affiche les demandes non envoyées des deux types.
   Elles restent visibles après un passage ultérieur du réglage en automatique.
4. L’approbation revérifie les restrictions, réclame la demande sous verrou,
   puis soumet le principal exact (sans enlever une seconde fois les frais).
   L’intention conserve pays, devise et identité d’origine. Il n’y a ni
   second débit ni statut « completed » forcé : AlphaPay doit être vérifié.
5. Le refus avant envoi restitue atomiquement principal et frais une seule
   fois. Les approbations/refus concurrents ou répétés ne peuvent réclamer la
   même demande deux fois. Un retour en attente n’est pas autorisé.
6. Un timeout conserve les fonds et la même référence d’idempotence.
   Une vérification de statut d’une sortie manuelle sans réponse fournisseur
   enregistrée ne peut jamais réinitier cette sortie, même pendant l’appel
   initial ou après un changement du réglage en automatique.
   Après soumission, un refus administrateur ne rembourse pas une issue
   fournisseur inconnue. Une interruption entre la réclamation et la création
   du binding exige un rapprochement manuel : aucun renvoi automatique aveugle.
7. Les anciennes sorties sans cette intention persistante ne sont pas
   réinitiées par l’ancien bouton de validation.

Ces mesures ne vérifient ni le financement AlphaPay, ni les droits PAYOUT, ni
la whitelist. Les exigences opérationnelles de l’audit restent applicables
avant toute activation.

## Vérification sans mouvements réels

`npm run test:payments` utilise les vrais gardes, routes et orchestration avec
base mémoire, authentification simulée et transport AlphaPay remplacé.
Les scénarios couvrent les routes, exemptions, restrictions directionnelles,
réservations et décisions concurrentes, remboursements CDF/frais XOF, refus
définitifs et timeouts. Ce ne sont pas des preuves de concurrence PostgreSQL.

`npm run check` et `npm run build` vérifient la compilation.
Le serveur métier n’a pas été lancé pour ces essais : son démarrage exécute
des initialisations SQL et programme un rapprochement des opérations réelles.
La capture d’aperçu a échoué (serveur non démarré) ; les écrans authentifiés
n’ont pas été validés visuellement.
