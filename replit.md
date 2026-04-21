# SolvexPay - Pan-African Payment Gateway

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

## Payment Providers (architecture multi-fournisseurs)

L'application supporte **plusieurs fournisseurs de paiement** gérés dynamiquement via la table `paymentProviders`. Un seul fournisseur peut être actif à la fois ; toutes les opérations (dépôt, retrait, transfert) utilisent automatiquement le fournisseur actif via le dispatcher central `paymentService`.

- **Table** `payment_providers` : `code` (unique), `displayName`, `isActive`, `apiKey`, `secretKey` (webhook secret), `baseUrl`, `config` (jsonb).
- **Table** `payment_provider_logs` : journal de tous les appels API (action, request/response, durée, erreur).
- **Dispatcher** : `server/services/paymentService.ts` — détecte le fournisseur actif (cache 30s), instancie le bon service et délègue. Routes inchangées.
- **Implémentations** :
  - `server/services/omnipay.ts` — `OmniPayService` (signature HMAC-SHA3-512)
- **Activation** : POST `/api/admin/payment-providers/:id/activate` — désactive automatiquement les autres (transaction DB).
- **Fournisseur par défaut** seedé au démarrage : `omnipay` (actif, hérite des env vars `OMNIPAY_API_KEY`/`OMNIPAY_CALLBACK_KEY`).
- **UI admin** : `/admin/payment-providers` — liste, toggle d'activation, configuration des clés, journal des appels.
- **Webhooks** : `/api/webhooks/omnipay`.

### Supported Countries & Operators
| Country | Code | Currency | Operators |
|---------|------|----------|-----------|
| Bénin | BJ | XOF | MTN, Moov |
| Côte d'Ivoire | CI | XOF | Orange, MTN, Moov, Wave |
| Burkina Faso | BF | XOF | Moov, Orange |
| Togo | TG | XOF | TMoney, Moov |
| Sénégal | SN | XOF | Orange, Wave, Free |
| Mali | ML | XOF | Orange, Moov |
| Cameroun | CM | XAF | MTN, Orange |
| RD Congo | COD | CDF | Vodacom, Airtel, Orange |
| Congo-Brazza. | COG | XAF | Airtel, MTN |

### Currency Conversion (all stored in XOF)
- **XAF → XOF**: 1:1 (same CFA zone)
- **CDF → XOF**: `Math.floor(amount × 0.22)` (no decimals)
- Logic in `server/storage.ts` → `updateWalletBalance()`

### OmniPay Quirks
- `getStatus()` returns `{ success: 0, message: "Transaction successful" }` for completed payments → mapped to `status: 3`
- `getOmniPayOperatorCode(operator, country)` function maps operator names to OmniPay-specific codes (e.g., Moov BJ → `moov_benin`, Moov TG → `moov_togo`)

## API Payment Flow (Mandatory Redirect)

All API integrations use a **mandatory redirect flow** to SolvexPay's hosted payment page. No USSD is triggered by the merchant's server.

### Step-by-step:
1. **Merchant server** calls `POST /api/v1/deposit` or redirects to `GET /api/v1/checkout`
2. SolvexPay creates a pending transaction and returns `payment_url`
3. **Merchant MUST redirect** the customer to `payment_url` (= `https://solvexpay.com/pay-api/:id`)
4. Customer fills in their phone number and selects their operator on the SolvexPay hosted page
5. OmniPay sends the USSD prompt to the customer's phone
6. Customer confirms on their phone
7. SolvexPay credits the merchant wallet and fires the webhook

### API Endpoints (merchant, requires `sk_live_` key)
- `GET /api/v1/checkout?key=&amount=&description=&customer_name=&customer_email=&country=` — Direct redirect to hosted page (no JS needed)
- `POST /api/v1/deposit` — JSON API: returns `{ id, payment_url, status, amount, fees, reference, ... }`
- `GET /api/v1/transactions/:id` — Check transaction status (read-only, no real-time operator call)
- `POST /api/v1/transactions/:id/verify` — Force real-time status check from operator; if completed, credits wallet and fires webhook immediately
- `GET /api/v1/balance` — Get merchant wallet balance

### Hosted Payment Page (`/pay-api/:id`)
- Pre-fills country, phone, and operator from transaction data if provided
- Customer selects operator, enters phone → USSD sent → auto-verification every 5s
- Wave payments: redirects to Wave checkout URL, returns via `?status=callback&reference=`
- Maintenance check enforced server-side (cannot pay via maintenance operator)

## Wave Payment Flow
- OmniPay returns a `payment_url` (Wave checkout link)
- All 3 pages (`deposit.tsx`, `pay-api.tsx`, `pay.tsx`) redirect via `window.location.href`
- After Wave confirmation, OmniPay redirects to `returnUrl` with reference
- Frontend detects `?status=callback&reference=` and starts polling verify endpoint

## Verify Endpoint (`/api/transactions/verify`)
- Polls OmniPay `getStatus()` every 5s from frontend
- OmniPay "Transaction successful" (`success: 0`) → correctly mapped to `status: 3` (completed)
- Credits wallet (net of fees) when status becomes "completed"
- **Atomic**: uses `updateTransactionStatusIfPending()` (conditional SQL WHERE status='pending') to prevent double-crediting in concurrent requests

## Webhook System
- Outbound webhooks: fired on `completed`/`failed` status change
- Signed with HMAC-SHA256 using per-key `webhookSecret` → `x-solvexpay-signature: sha256=...`
- OmniPay inbound: `POST /api/webhooks/omnipay` with `OMNIPAY_CALLBACK_KEY` verification
- 3 retries: immediate → 8s delay → 30s delay
- `callbackUrl: "https://solvexpay.com/api/webhooks/omnipay"` sent on every OmniPay deposit call

## Auto-Recovery (PendingChecker)
- Background job in `server/routes.ts` → `startPendingChecker()`
- Starts 30s after server boot, runs every 3 minutes
- Checks pending deposits between 90s and 1h old (max 15 per batch)
- Calls OmniPay `getStatus()` → if completed: credits wallet + fires merchant webhook
- Prevents double-crediting via `updateTransactionStatusIfPending()` (atomic SQL WHERE status='pending')

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
- `server/services/omnipay.ts` — OmniPay integration + status mapping
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
| `OMNIPAY_API_KEY` | Clé API OmniPay (tableau de bord OmniPay) |
| `OMNIPAY_CALLBACK_KEY` | Clé de signature des callbacks OmniPay |
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
