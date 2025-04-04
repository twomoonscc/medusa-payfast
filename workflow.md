# PayFast Medusa Integration Workflow

This document outlines the expected payment flow when integrating PayFast with Medusa using a redirect-based approach and Instant Transaction Notification (ITN).

## High-Level Flow

1.  **User Checkout:** Customer initiates checkout in the Medusa storefront.
2.  **Initiate & Redirect:** Medusa backend prepares payment data, generates a signature, and provides data to redirect the user's browser to PayFast.
3.  **PayFast Payment:** Customer completes (or cancels) the payment on the PayFast platform.
4.  **User Return:** PayFast redirects the customer's browser back to the merchant's `return_url` or `cancel_url`. (This is for user feedback, not final confirmation).
5.  **ITN Sent:** PayFast sends a server-to-server POST request (ITN) to the merchant's `notify_url`.
6.  **ITN Validation & Order Update:** Medusa backend receives the ITN, validates its authenticity and data, and updates the Medusa order status accordingly (e.g., captures payment).

## Detailed Steps within Medusa Provider

1.  **`initiatePayment` (Medusa Backend):**
    *   Triggered during Medusa checkout.
    *   Gathers required data: Merchant ID, Merchant Key, Amount, Currency, Order ID (as `m_payment_id`), Customer Details, `return_url`, `cancel_url`, `notify_url`.
    *   Constructs the data payload according to PayFast's variable requirements (parameter order matters).
    *   Calculates the security `signature` using the payload and the Merchant Passphrase (using the PayFast SDK).
    *   Returns data needed for redirection (e.g., PayFast processing URL + parameters, or individual form fields including the signature).

2.  **Redirect Handling (Storefront/Backend):**
    *   Uses the data from `initiatePayment` to POST the user's browser to PayFast's processing endpoint (e.g., `https://sandbox.payfast.co.za/eng/process`). An auto-submitting form is common.

3.  **User completes payment on PayFast.**

4.  **Return/Cancel URL Handling (Storefront):**
    *   User is redirected back from PayFast to the specified `return_url` or `cancel_url`.
    *   These frontend routes display appropriate status messages (e.g., "Payment successful, awaiting confirmation", "Payment failed/cancelled").
    *   **Important:** Do not finalize the order based on this browser redirect. Wait for the ITN.

5.  **ITN Endpoint (Medusa Backend - `notify_url`):**
    *   A dedicated API route within the PayFast provider module listens for POST requests from PayFast.

6.  **ITN Validation (Medusa Backend - ITN Endpoint):**
    *   Receive POST data from PayFast.
    *   **Perform Security Checks:**
        *   Verify the source IP address against PayFast's published list.
        *   Re-calculate the signature from the received ITN data (using the PayFast SDK and passphrase) and compare it to the received `signature`.
        *   Verify `m_payment_id`, `amount`, `currency`, etc., against the corresponding Medusa order/payment session.
        *   Check if the transaction hasn't already been processed.
    *   If validation fails: Respond with HTTP 400 (or similar error) and log details. Do *not* update the order.
    *   If validation succeeds: Respond with HTTP 200 OK.

7.  **`capturePayment` / Order Update (Medusa Backend - Post-ITN Validation):**
    *   If validated ITN status is `COMPLETE`:
        *   Find the Medusa Payment/Order via `m_payment_id`.
        *   Call the Medusa Payment Service's `capturePayment` method (or equivalent) for the corresponding payment session.
        *   Update the Medusa Order status (e.g., to 'completed').
    *   If validated ITN status is `FAILED` (or other non-success state):
        *   Update the Medusa Payment/Order status accordingly.

## Required Configuration

*   PayFast Merchant ID
*   PayFast Merchant Key
*   PayFast Passphrase
*   `return_url` (Storefront route)
*   `cancel_url` (Storefront route)
*   `notify_url` (Backend API endpoint in this module)
*   PayFast Server IP addresses (for ITN validation)

## Notes & Potential Challenges

*   The official `@payfast/core` SDK documentation was not readily found via web search. Its specific functions for signature generation and ITN validation need to be confirmed by inspecting the package or further research.
*   The `@payfast/core` package is relatively old (published 5 years ago). Compatibility and potential need for modernization should be considered.
*   Correct parameter ordering for signature generation is critical.
*   Robust ITN validation is essential for security. 