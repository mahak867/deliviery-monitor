# SwiftSeva India Delivery Platform (Phase 2)

All-in-one Indian delivery platform with:

- Customer app
- Vendor app
- Rider app
- Admin app
- Hybrid logistics (own fleet + partner network)
- Multi-payment routing (UPI, card, wallet, COD)
- OTP login + JWT session support
- File or PostgreSQL persistence modes

## Run

```bash
npm install
npm start
```

Open:

- `http://localhost:3000/` platform landing
- `http://localhost:3000/customer.html`
- `http://localhost:3000/vendor.html`
- `http://localhost:3000/rider.html`
- `http://localhost:3000/admin.html`

## Environment Setup

Copy `.env.example` to `.env` and set values.

Key variables:

- `PERSISTENCE_MODE=file|postgres`
- `POSTGRES_URL=postgres://...` (required when postgres mode is used)
- `ENFORCE_AUTH=true|false`
- `APP_JWT_SECRET=...`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX`
- `PAYTM_MID`, `PAYTM_MERCHANT_KEY`
- `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` (for OTP SMS sending)

## Auth Flow

1. `POST /api/auth/request-otp` with `phone`, `role`, optional `name`
2. `POST /api/auth/verify-otp` with `phone`, `role`, `challengeId`, `code`
3. Use token in header: `Authorization: Bearer <token>`

If SMS provider is not configured, OTP is returned in response as `devOtp`.

## Database Modes

### File mode (default)

- Uses `data/store.json`

### PostgreSQL mode

- Set `PERSISTENCE_MODE=postgres` and `POSTGRES_URL`
- Uses schema in [schema.sql](C:\Users\Mahak\.codex\worktrees\376f\Downloads\database\schema.sql)
- Current implementation stores full app state in `app_state` JSONB row

## Payments

- COD/Wallet: internal flow
- Razorpay: live backend order creation when keys are configured
- PhonePe/Paytm: integration-ready mode when credentials are present
- Fallback simulation when no live credentials are available

### Razorpay Verification and Webhooks

- Verify checkout signature:
  - `POST /api/payments/razorpay/verify-signature`
  - Body fields: `orderId`, `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`
- Handle webhook:
  - `POST /api/payments/razorpay/webhook`
  - Validates `X-Razorpay-Signature` using raw request body and `RAZORPAY_WEBHOOK_SECRET`
  - Processes `payment.captured`, `order.paid`, `payment.failed`

## Key APIs

- `GET /api/health`
- `GET /api/system/config`
- `GET /api/bootstrap`
- `GET /api/catalog`
- `GET /api/payments/options`
- `GET /api/payments/providers`
- `POST /api/payments/quote`
- `POST /api/payments/razorpay/verify-signature`
- `POST /api/payments/razorpay/webhook`
- `GET /api/customer/serviceability?pincode=560001`
- `POST /api/customer/orders`
- `GET /api/customer/orders?phone=...`
- `GET /api/customer/orders/:id`
- `POST /api/customer/orders/:id/cancel`
- `GET /api/vendor/orders?vendorId=...`
- `POST /api/vendor/orders/:id/status`
- `GET /api/rider/orders?scope=available`
- `POST /api/rider/orders/:id/accept`
- `POST /api/rider/orders/:id/status`
- `GET /api/admin/metrics`
- `GET /api/admin/orders`
- `POST /api/admin/fleet-policy`
- `POST /api/support/tickets`

## Notes

- Role dashboards now accept saved bearer tokens from local storage.
- `ENFORCE_AUTH=false` keeps backward compatibility during setup.
- `public/customer_prototype.html` preserves the earlier customer-only prototype.
