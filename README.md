payment-service
A fully isolated, high-trust financial microservice responsible for payment processing, escrow management, fund release, refunds, and transaction lifecycle tracking.

Responsibilities
✅ Does	❌ Does NOT
Payment processing (Stripe, Paystack, Flutterwave)	User authentication
Escrow holding and release	Notifications or email/SMS
Refund processing	Marketplace logic (bookings/reviews)
Transaction lifecycle tracking	Gateway routing
Webhook ingestion and idempotent processing	WebSocket connections
Architecture
API Gateway
   ↓
backend-api (business logic)
   ↓
payment-service (this service — escrow engine)
   ↓
Stripe / Paystack / Flutterwave

Escrow State Machine
CREATED → FUNDED → HELD → RELEASED
                     ↓
                  REFUNDED
                     ↓
                  DISPUTED → RELEASED
                           → REFUNDED

Stack
Node.js 22 + TypeScript + Express 5
Prisma + PostgreSQL
BullMQ + Redis (async job processing)
Stripe, Paystack, Flutterwave
Pino (structured logging)
Zod (validation)
Docker + GitHub Actions
Quick Start
# 1. Copy environment file
cp .env.example .env
# 2. Install dependencies
pnpm install
# 3. Generate Prisma client
pnpm run db:generate
# 4. Push schema to database
pnpm run db:push
# 5. Seed development data
pnpm run db:seed
# 6. Start development server
pnpm run dev

With Docker:

docker-compose up

API Reference
Base URL
/api/v1

Health
GET  /api/healthz           — Full health check with DB status
GET  /api/readyz             — Readiness probe

Payments
POST   /api/v1/payments                    — Initiate payment
GET    /api/v1/payments?userId=...         — List user payments
GET    /api/v1/payments/:id                — Get payment
GET    /api/v1/payments/reference/:ref     — Get by reference
POST   /api/v1/payments/:id/refund         — Initiate refund
GET    /api/v1/payments/:id/transactions   — Get payment transactions

Escrow
POST   /api/v1/escrow                          — Create escrow
GET    /api/v1/escrow                          — List escrows (service auth)
GET    /api/v1/escrow/stats                    — Escrow stats
GET    /api/v1/escrow/booking/:bookingId       — Get by booking ID
GET    /api/v1/escrow/:id                      — Get escrow
POST   /api/v1/escrow/:id/fund                 — Fund escrow (service auth)
POST   /api/v1/escrow/:id/release              — Release funds to payee (service auth)
POST   /api/v1/escrow/:id/refund               — Refund to payer (service auth)
POST   /api/v1/escrow/:id/dispute              — Raise dispute

Transactions
GET    /api/v1/transactions              — List all transactions (service auth)
GET    /api/v1/transactions/stats        — Transaction stats (service auth)
GET    /api/v1/transactions/:id          — Get transaction (service auth)

Webhooks
POST   /api/v1/webhooks/stripe           — Stripe webhook endpoint
POST   /api/v1/webhooks/paystack         — Paystack webhook endpoint
POST   /api/v1/webhooks/flutterwave      — Flutterwave webhook endpoint

Event Integration
Inbound (from backend-api)
Event	Action
booking.created	POST /api/v1/escrow — create escrow
booking.completed	POST /api/v1/escrow/:id/release — release funds
booking.cancelled	POST /api/v1/escrow/:id/refund — refund buyer
Outbound (emitted to notification-service)
Event	Trigger
payment.completed	Payment confirmed by provider
escrow.released	Funds sent to professional
escrow.refunded	Buyer refunded
escrow.disputed	Dispute raised
Authentication
User requests — require Authorization: Bearer <token> + x-user-id header
Service-to-service — require x-service-api-key: <SERVICE_API_KEY>
Webhooks — verified via provider signatures (no API key needed)
Environment Variables
See .env.example for the full list.

Variable	Required	Description
DATABASE_URL	✅	PostgreSQL connection string
REDIS_URL	optional	Redis URL (falls back to sync processing)
SERVICE_API_KEY	optional	Internal service auth key
STRIPE_SECRET_KEY	optional	Stripe secret key
STRIPE_WEBHOOK_SECRET	optional	Stripe webhook signing secret
PAYSTACK_SECRET_KEY	optional	Paystack secret key
FLUTTERWAVE_SECRET_KEY	optional	Flutterwave secret key