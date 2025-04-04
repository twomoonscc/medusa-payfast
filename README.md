# Medusa PayFast Provider

A module for Medusa 2.5.x that adds a PayFast payment provider.

## DEV PLAN

Official stripe payment provider: https://github.com/medusajs/medusa/tree/develop/packages/modules/providers/payment-stripe

Official PayFast API Node client: https://github.com/payfast-api/core (Link seems broken/private)

Unofficial PayFast API Node client: https://github.com/ronaldlangeveld/node-payfast (Used for signature logic reference)

(For reference) Official PayFast API PHP client: https://github.com/Payfast/payfast-php-sdk

Medusa docs: https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider#content

PayFast ITN Docs: https://developers.payfast.co.za/docs/itn-instant-transaction-notification/

## Goal

- [x] Reference and modernise the relevant PayFast API Node client logic
- [x] Use typescript and Medusa 2.5.x compatible code
- [x] Use web search to check if there are gaps in knowledge
- [x] Record useful findings in this README
- [ ] Create meaningful tests
- [x] Suggest literally cloning the stripe module and modifying it for PayFast, although the flow will be different. Good for getting testing config up and running quickly.

## Progress (as of YYYY-MM-DD)

- [x] Set up basic project structure and types (`PayFastOptions`, `PaymentProviderKeys`).
- [x] Created skeleton `PayFastCustomIntegrationService` extending `AbstractPaymentProvider`.
- [x] Implemented PayFast utility functions (`generatePayFastSignature`, `validatePayFastItnSignature`, `buildPayFastUrl`) in `src/utils/payfast-utils.ts`.
- [x] Implemented `initiatePayment` method:
    - Collects data from input.
    - Validates required fields.
    - Constructs PayFast data object.
    - Generates signature.
    - Returns `InitiatePaymentOutput` compatible data.
- [x] Implemented `getPaymentStatus` method (returns default based on webhook reliance).
- [x] Implemented `getWebhookActionAndData` method:
    - Receives ITN data.
    - Validates ITN signature.
    - Maps PayFast status (`COMPLETE`, `FAILED`) to Medusa `PaymentActions`.
    - Returns `WebhookActionResult` with `session_id` and `amount`.

## Remaining Steps

- **Implement Remaining Payment Methods:**
    - `authorizePayment`: PayFast doesn't have a separate authorize step like Stripe. Payments are typically captured immediately. This method might just return `AUTHORIZED` if `initiatePayment` was successful, or perhaps it's not needed if the flow relies purely on ITN for completion.
    - `capturePayment`: Similar to authorize, PayFast's standard flow captures immediately. This might just return the current status based on ITN or internal state.
    - `refundPayment`: Implement refund logic using PayFast's API (requires separate API calls, potentially using `fetch` or a library like `axios`). Needs signature generation similar to the dev.to article found.
    - `cancelPayment`: Check if PayFast supports cancellation of initiated but not completed payments via API. If not, this might just return the current status.
    - `deletePayment`: Likely maps to `cancelPayment` if supported.
    - `retrievePayment`: Check if PayFast offers an API endpoint to fetch transaction details by `pf_payment_id` or `m_payment_id`.
    - `updatePayment`: Unlikely to be supported by PayFast's standard flow.
- **Refine Webhook Handling:**
    - Implement more robust ITN validation (IP address check, validation endpoint query - requires HTTP client like `axios` or `node-fetch`).
    - Handle more PayFast payment statuses if necessary.
- **Error Handling:** Enhance error handling across all methods.
- **Configuration:** Add detailed instructions on necessary PayFast account setup (Merchant ID/Key, Passphrase, ITN URL).
- **Testing:** Implement unit and integration tests for utilities and service methods.
- **Documentation:** Add comprehensive JSDoc comments and potentially usage examples.
