# SolvexPay - Pan-African Payment Aggregator

## Overview

SolvexPay is a pan-African payment aggregation platform that enables businesses to accept Mobile Money payments across multiple African countries. The application provides a merchant dashboard for managing wallets, transactions, payment links, and API keys.

### SendavaPay Integration (Feb 2026)
- **API**: SendavaPay API v1 at https://sendavapay.com/api/v1/*
- **Auth**: Simple Bearer token (Authorization: Bearer sk_live_...) - no HMAC signatures needed for API calls
- **Mode**: Redirect-based - customer redirected to SendavaPay payment page (paymentUrl) to choose operator and pay
- **Operators**: MTN, Moov, Orange, TMoney, Wave (SendavaPay handles operator selection on their payment page)
- **Currencies**: XOF (UEMOA), XAF (CEMAC), CDF (Congo)
- **Statuses**: `pending`, `completed`, `failed`, `cancelled` (lowercase)
- **Response format**: All API responses wrap data in `{ success: true, data: { ... } }`
- **Endpoints**:
  - POST /create-payment (fields: amount, currency, customerPhone, customerName, customerEmail, description, redirectUrl) → returns `data.reference` and `data.paymentUrl`
  - POST /verify-payment (field: reference) → returns `data.status`
  - POST /credit-account (fields: phone, amount, description) → withdraw/credit to SendavaPay account
  - GET /balance, GET /transactions
- **Secrets**: SENDAVAPAY_API_KEY (Bearer token, format sk_live_...), SENDAVAPAY_API_SECRET (for webhook signature verification only)
- **Webhook**: POST /api/webhooks/sendavapay - receives payment.completed, payment.failed, credit.completed events with X-SendavaPay-Signature HMAC-SHA256 verification
- **Callback**: GET /api/payment/callback - redirect URL after payment, redirects to /deposit?status=callback
- **Polling**: Frontend polls /api/transactions/verify every 5s for pending payments
- **Webhook URLs endpoint**: GET /api/settings/webhook-urls - returns configured webhook/callback URLs for SendavaPay dashboard setup

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration supporting dark/light modes
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Tables**: 
  - `users` - User accounts (managed by Replit Auth)
  - `sessions` - Session storage for authentication
  - `wallets` - User wallet balances per currency
  - `transactions` - Deposit/withdrawal records
  - `paymentLinks` - Shareable payment links with unique slugs
  - `apiKeys` - Developer API keys with hashed storage

### Authentication Flow
- Replit Auth handles user authentication via OIDC
- Sessions stored in PostgreSQL with 7-day TTL
- Protected routes use `isAuthenticated` middleware
- User data synced on login via upsert pattern

### Key Design Decisions

1. **Monorepo Structure**: Client, server, and shared code colocated with path aliases (`@/`, `@shared/`)

2. **Type Safety**: Shared schema between frontend and backend ensures consistent types across the stack

3. **API Key Security**: Keys are hashed before storage; only prefix shown for identification

4. **Multi-Currency Support**: Wallet stores separate balances for each supported currency (XOF, NGN, GHS, KES)

5. **French Localization**: UI is primarily in French targeting francophone African markets

## External Dependencies

### Database
- PostgreSQL (required) - Connection via `DATABASE_URL` environment variable

### Authentication
- Replit Auth (OIDC provider) - Uses `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables

### UI Libraries
- Radix UI primitives for accessible components
- Lucide React for icons
- Embla Carousel for carousels
- React Day Picker for date selection
- Recharts for data visualization

### Development Tools
- Vite for frontend bundling
- esbuild for server bundling in production
- Drizzle Kit for database migrations (`npm run db:push`)