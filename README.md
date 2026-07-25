# Payment Service

## Overview

The **payment-service** manages all payment operations for the Marketplace platform. It securely handles payment processing, escrow management, withdrawals, refunds, payouts, transaction records, and payment provider integrations.

This service is the only component responsible for communicating with external payment providers.

---

## Responsibilities

- Payment processing
- Escrow management
- Transaction management
- Withdrawals
- Payouts
- Refunds
- Payment provider integration
- Webhook verification
- Financial audit logging
- Payment event publishing

---

## Integrations

- API Gateway
- Auth Service
- Backend API
- Notification Service
- Realtime Service
- Database
- Shared Types

---

## External Providers

- Paystack
- Flutterwave
- Stripe (future)
- Other supported payment providers

---

## Tech Stack

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- Redis
- Docker
- GitHub Actions

---

## Security

- Webhook signature verification
- Encrypted secrets
- Idempotent payment processing
- Audit logging
- Role-based access control

---

## License

Licensed under the Marketplace project license. See the `LICENSE` file for details.
