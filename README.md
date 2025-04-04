# Medusa PayFast Provider

A module for Medusa 2.5.x that adds a PayFast payment provider.

## DEV PLAN

Official stripe payment provider: https://github.com/medusajs/medusa/tree/develop/packages/modules/providers/payment-stripe

Official PayFast API Node client: https://github.com/payfast-api/core

Unofficial PayFast API Node client: https://github.com/ronaldlangeveld/node-payfast

(For reference) Official PayFast API PHP client: https://github.com/Payfast/payfast-php-sdk

Medusa docs: https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider#content

## Goal

- [ ] Reference and modernise the official PayFast API Node client
- [ ] Use typescript and Medusa 2.5.x compatible code
- [ ] Use web search to check if there are gaps in knowledge
- [ ] Record useful findings in this README
- [ ] Create meaningful tests
- [x] Suggest literally cloning the stripe module and modifying it for PayFast, although the flow will be different. Good for getting testing config up and running quickly.
