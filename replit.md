# SolvexPay - Pan-African Payment Gateway

## Lancer le projet importé sur Replit

- Conserver la structure existante : React/Vite côté client, Express côté serveur.
- Installer les dépendances indiquées dans `package.json` et `package-lock.json`.
- Démarrer avec **Run** (workflow `Start application`) ou `npm run dev`.
- Le serveur écoute sur `0.0.0.0:5000` et sert le client et l'API sur la même origine.
- `DATABASE_URL` et `SESSION_SECRET` sont nécessaires. La connexion PostgreSQL existante répond et les tables sont déjà présentes : ne pas recréer la base, importer les sauvegardes SQL ou lancer `db:push` pour un simple démarrage.
- `npm run build` prépare la version de production ; `npm start` démarre cette version.
- Express a été mis à jour dans la même version majeure pour éviter une dépendance bloquée par le registre de sécurité.
- Le webhook Telegram n'est enregistré au démarrage que si `TELEGRAM_BOT_TOKEN` et `TELEGRAM_CHAT_ID` sont explicitement configurés. Un bot n'a qu'un webhook : utiliser un bot de test distinct pour éviter que l'aperçu remplace le webhook d'un site en production.
- L'affichage du site ne valide pas les paiements réels ni l'envoi d'emails. Ces services nécessitent leurs configurations respectives.
- Le contrôle `npm run check` signale des erreurs TypeScript héritées de l'import ; leur correction est distincte de la mise en route.

## Overview

SolvexPay is a pan-African payment aggregation platform enabling businesses to accept Mobile Money payments across 9 African countries. Built with React/TypeScript frontend, Express.js backend, and PostgreSQL (Neon) with Drizzle ORM.

## Design System

### Color Palette
- **Primary**: Violet `262 83% 58%` (buttons, links, accents)
- **Sidebar**: Dark navy gradient `hsl(262 60% 10%)` → `hsl(262 50% 16%)` → `hsl(240 30% 8%)`
- **Emerald accent**: `160 84% 50%` (success states, active badges)
- **Amber**: `38 92% 50%` (warnings, highlights)
- **Background light**: `240 20% 98%`

### CSS Utilities
- `.gradient-brand` — violet-to-purple gradient
- `.gradient-emerald` — emerald gradient
- `.glass` — glassmorphism card effect
- `.mesh-bg` — subtle mesh background for hero sections
- `.text-gradient-brand` — animated gradient text

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query v5 (object-form only)
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme
- **Build Tool**: Vite

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules (tsx)
- **API Pattern**: RESTful endpoints under `/api/*`
- **Authentication**: Replit Auth (OIDC + Passport.js)
- **Session Management**: PostgreSQL-backed sessions (7-day TTL)

### Data Storage
- **Database**: PostgreSQL (Neon) via `DATABASE_URL`
- **ORM**: Drizzle ORM with drizzle-zod
- **Schema**: `shared/schema.ts`
- **Tables**:
  - `users` — Replit Auth user accounts
  - `sessions` — Session storage
  - `wallets` — User wallet balances (`balanceXOF` column — all currencies converted to XOF)
  - `transactions` — All financial operations (deposit/withdrawal/transfer)
  - `paymentLinks` — Shareable payment links with unique slugs
  - `apiKeys` — Merchant API keys (`sk_live_` prefix, hashed storage)
  - `paymentMethods` — Operator maintenance/availability config (admin-managed)
  - `systemSettings` — Key-value settings (fees, support links)

## AlphaPay — unique fournisseur des nouvelles opérations

- Choix produit confirmé par l’utilisateur : supprimer entièrement les anciens modules et options de paiement, utiliser AlphaPay directement via SDK/API et conserver l’historique. Ne pas réintroduire de sélection ou de secours vers les anciens fournisseurs.
- Les anciens modules, formulaires de clés, sélecteurs de fournisseur, modals et webhooks ont été retirés du code actif. Les écritures historiques restent inchangées.
- SDK officiel Node.js : alphapay-node. Documentation : https://docs.alphapay.me/javascript-sdk et https://docs.alphapay.me/node-sdk.
- Encaissements : choix utilisateur explicite, propre formulaire SolvexPay sans redirection automatique. Tous les nouveaux encaissements utilisent Softpay côté serveur, pas de checkout externe ni popup/iframe AlphaPay. Si AlphaPay impose une checkout_url, l’interface indique que cette tentative n’est pas disponible sans redirection ; aucune URL externe n’est exposée et aucun push téléphone n’est annoncé à tort. La référence et le statut réel restent conservés pour rapprochement. Ne pas réintroduire de redirection de paiement ni de redirection automatique post-succès vers un marchand.
- Décaissements : API payouts/initialize, fonds réservés atomiquement avant envoi. Autorisation payin/payout, KYC, solde AlphaPay et IP autorisée sont requis. Replit ne garantit pas d’IP sortante fixe ; prévoir une sortie fixe avant l’activation durable.
- Secrets : ALPHAPAY_SECRET_KEY et ALPHAPAY_WEBHOOK_SECRET. Aucune clé secrète ni clé publique n’est envoyée au navigateur : les demandes Softpay sont créées par le serveur.
- Webhook : POST /api/webhooks/alphapay. Signature X-Webhook-Signature : HMAC-SHA256 du timestamp suivi d’un point puis du corps brut ; X-Webhook-Timestamp doit dater de moins de cinq minutes. Les exemples du SDK JavaScript mentionnent un autre header, mais la référence webhook actuelle et le SDK serveur sont la source de vérité.
- La confirmation navigateur et la redirection ne prouvent pas un paiement. Les montants, devises et sens sont rapprochés via les endpoints verify authentifiés avant règlement.
- Les références locales et IDs AlphaPay sont conservés dans les journaux de liaison persistants. Les retries réutilisent exactement la même intention et clé d’idempotence ; une réponse incertaine garde les fonds réservés.
- Statut final et mouvement du portefeuille sont validés dans une même transaction SQL verrouillée. Pas de double crédit, de remboursement sur timeout ou de validation manuelle d’un paiement AlphaPay en attente.
- Les paiements historiques sans liaison AlphaPay nécessitent un rapprochement manuel ; ne pas les envoyer au nouveau fournisseur, les échouer ou les rembourser automatiquement.
- Pays existants pris en charge : BJ, CI, BF, TG, SN, ML, CM, COD (normalisé CD). Congo-Brazzaville est retiré des nouvelles opérations, car absent du catalogue AlphaPay. Les montants et réseaux sont validés côté serveur ; pas de conversion implicite de devise.
- Les frais de SolvexPay sont conservés. Le bénéfice net après frais fournisseur n’est pas présenté comme connu tant que ces coûts réels ne sont pas rapprochés.
- Vérification locale : npm run check, npm run build, node --import tsx --test server/services/alphapay.test.ts. Aucun test local ne doit appeler un service de paiement réel ou écrire dans la base métier.
- Administration : /admin/payment-providers affiche uniquement le statut AlphaPay et ses exigences, /api/admin/alphapay/config ne renvoie que des indicateurs sans secret. Les anciens endpoints de gestion de fournisseurs ne sont plus disponibles.

## Telegram Notifications
- Bot sends alerts for completed deposits and withdrawals to admin
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` — hardcoded fallback values in `server/services/telegram.ts` (token: `7671423781:AAF...`, chat: `8360195532`)
- Set as env vars to override the hardcoded defaults

## Maintenance System
- Admin can set operators to global maintenance or per-country maintenance
- `paymentMethods` table: `inMaintenance` (boolean) + `maintenanceCountries` (text[])
- Checked server-side in all public pay routes (payment links + API page)
- `/api/payment-methods/public` seeds defaults if table empty (same as admin route)

## Fee Structure
- `fee_api` = 7% (API payments) — admin-editable
- `fee_deposit` = 7% (dashboard deposits) — admin-editable
- `fee_withdrawal` = 7%
- `fee_transfer` = 7%

## Security

### Rate Limiting (express-rate-limit)
- **Auth routes**: login (10/15min), register (5/1h), codes (10/15min), forgot-password (5/1h)
- **Payment routes**: deposit/withdraw/transfer (10/1min), verify (30/1min)

### Security Headers (helmet)
- Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, etc.

### CORS
- Configured via `ALLOWED_ORIGINS` env var (comma-separated list)
- In development: all origins allowed

### Atomic Operations
- Verify routes: use `updateTransactionStatusIfPending()` to prevent double-crediting
- Admin migration: wrapped in DB transaction (`db.transaction()`)

### checkOperatorMaintenance
- On DB error: returns blocking message (not null) — fails safe

## Authentication
- Replit Auth handles OIDC flow
- Admin: `vianneyessou@gmail.com` (stored in `admin_credentials.txt`)
- KYC required to use API endpoints

## Key Files
- `server/routes.ts` — All API routes
- `server/services/alphapay.ts` — AlphaPay integration + status mapping
- `server/storage.ts` — DB operations + currency conversion
- `client/src/pages/deposit.tsx` — Dashboard deposit page
- `client/src/pages/pay-api.tsx` — Hosted API payment page
- `client/src/pages/pay.tsx` — Payment links page
- `client/src/pages/documentation.tsx` — In-app API documentation
- `shared/schema.ts` — Database schema

## Migration vers un autre compte / Remix

Si vous déplacez ou remixez ce projet, voici **tout ce qu'il faut reconfigurer** dans le nouveau Repl.

### Variables d'environnement (non-sensibles)
À remettre dans l'onglet **Secrets** ou **Environment Variables** :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-green-firefly-ajwso37y.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require` |

### Secrets (sensibles — à remettre manuellement)

| Secret | Description |
|--------|-------------|
| `SESSION_SECRET` | Clé aléatoire longue pour sécuriser les sessions Express |
| `ALPHAPAY_SECRET_KEY` | Clé API AlphaPay (tableau de bord AlphaPay) |
| `ALPHAPAY_WEBHOOK_SECRET` | Clé de signature des callbacks AlphaPay |
| `RESEND_API_KEY` | Clé API Resend (envoi d'emails) |
| `RESEND_FROM_EMAIL` | Adresse email d'envoi (ex: noreply@solvexpay.com) |
| `DATABASE_URL` | Même URL Neon que ci-dessus (aussi en secret) |
| `TELEGRAM_BOT_TOKEN` | Token du bot Telegram (optionnel — fallback hardcodé dans telegram.ts) |
| `TELEGRAM_CHAT_ID` | Chat ID Telegram admin (optionnel — fallback hardcodé dans telegram.ts) |
| `ALLOWED_ORIGINS` | Origines CORS autorisées, séparées par virgules (ex: `https://monsite.com,https://app.monsite.com`) |

### Base de données
- Hébergée sur **Neon** (externe, pas sur Replit) → les données suivent automatiquement via `DATABASE_URL`
- Aucune migration à faire : la base existe déjà sur Neon

### Intégrations Replit à réinstaller
- `javascript_log_in_with_replit` (auth)
- `javascript_database` (session store)
- `resend` (email)

### Après remix
1. Remettre tous les secrets ci-dessus
2. Redémarrer le workflow "Start application"
3. L'application sera opérationnelle avec toutes les données

## User Preferences
- Communication style: Simple, everyday language (French)
- No emojis unless requested
