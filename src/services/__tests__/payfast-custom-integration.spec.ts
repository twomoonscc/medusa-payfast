import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import PayFastCustomIntegrationService from "../payfast-custom-integration"
import type { PayFastOptions } from "../../types"
import { baseItn, signedItn, signForTest, signAsPayFastDoes } from "../../__fixtures__/itn"

// Deliberately NOT mocking AbstractPaymentProvider, the signing utils or uuid:
// these tests exercise the real provider class end to end.

const options: PayFastOptions = {
  merchant_id: "10000100",
  merchant_key: "46f0cd694581a",
  passphrase: "secret phrase",
  sandbox: true,
  return_url: "http://dummy.com/return",
  cancel_url: "http://dummy.com/cancel",
  notify_url: "http://dummy.com/notify",
}

const make = (opts: Partial<PayFastOptions> = {}) =>
  new PayFastCustomIntegrationService({}, { ...options, ...opts })

const initiateInput = (data: Record<string, unknown> = {}, amount: any = 15050) => ({
  amount,
  currency_code: "zar",
  data: {
    return_url: "http://store.com/return",
    cancel_url: "http://store.com/cancel",
    notify_url: "http://api.com/notify",
    resource_id: "cart_123",
    ...data,
  },
  context: {},
})

const webhook = (data: unknown) => ({ data, rawData: "", headers: {} }) as any

describe("PayFastCustomIntegrationService", () => {
  let errorSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  describe("construction", () => {
    it("exposes the provider identifier used to build the Medusa provider id", () => {
      expect(PayFastCustomIntegrationService.identifier).toBe("payfast")
    })

    it("throws without merchant_id", () => {
      expect(() => make({ merchant_id: "" })).toThrow("merchant_id is required")
    })

    it("throws without merchant_key", () => {
      expect(() => make({ merchant_key: "" })).toThrow("merchant_key is required")
    })

    it("validates static options via the framework hook", () => {
      expect(() =>
        PayFastCustomIntegrationService.validateOptions?.(options)
      ).not.toThrow()
    })
  })

  describe("initiatePayment", () => {
    it("converts minor units to a 2dp decimal string", async () => {
      const svc = make()
      const cases: [any, string][] = [
        [15050, "150.50"],
        [5, "0.05"],
        [100, "1.00"],
        ["2500", "25.00"],
      ]
      for (const [amount, expected] of cases) {
        const res = await svc.initiatePayment(initiateInput({}, amount))
        expect(res.data!.amount).toBe(expected)
      }
    })

    it("uses resource_id as m_payment_id and returns it as the session id", async () => {
      const res = await make().initiatePayment(initiateInput())
      expect(res.id).toBe("cart_123")
      expect(res.data!.m_payment_id).toBe("cart_123")
      expect(res.data!.item_name).toBe("Payment for Cart cart_123")
    })

    it("prefers the Medusa payment session id so ITNs can be matched back to the session", async () => {
      const viaData = await make().initiatePayment(initiateInput({ session_id: "payses_1" }))
      expect(viaData.id).toBe("payses_1")
      expect(viaData.data!.m_payment_id).toBe("payses_1")

      const viaContext = await make().initiatePayment({
        ...initiateInput(),
        context: { idempotency_key: "payses_2" },
      })
      expect(viaContext.id).toBe("payses_2")
    })

    it("generates a unique medusa-<uuid> id when no resource_id is given", async () => {
      const svc = make()
      const a = await svc.initiatePayment(initiateInput({ resource_id: undefined }))
      const b = await svc.initiatePayment(initiateInput({ resource_id: undefined }))
      expect(a.id).toMatch(/^medusa-[0-9a-f-]{36}$/)
      expect(a.id).not.toBe(b.id)
      expect(a.data!.item_name).toMatch(/^Payment for Transaction medusa-/)
    })

    it("embeds merchant credentials and the urls from the data payload", async () => {
      const { data } = await make().initiatePayment(initiateInput())
      expect(data).toMatchObject({
        merchant_id: "10000100",
        merchant_key: "46f0cd694581a",
        return_url: "http://store.com/return",
        cancel_url: "http://store.com/cancel",
        notify_url: "http://api.com/notify",
      })
    })

    it("produces a signature PayFast would accept (independently recomputed)", async () => {
      const { data } = await make().initiatePayment(
        initiateInput({
          email: "buyer@example.com",
          name_first: "Ann Marie",
          name_last: "O'Neil",
          cell_number: "0821234567",
          item_description: "Two prints & a frame",
        })
      )
      const { signature, ...rest } = data as Record<string, string>
      expect(signature).toBe(signForTest(rest, "secret phrase"))
    })

    it("signs without a passphrase when none is configured", async () => {
      const { data } = await make({ passphrase: undefined }).initiatePayment(
        initiateInput()
      )
      const { signature, ...rest } = data as Record<string, string>
      expect(signature).toBe(signForTest(rest))
    })

    it("changes the signature when the amount changes", async () => {
      const svc = make()
      const a = await svc.initiatePayment(initiateInput({}, 1000))
      const b = await svc.initiatePayment(initiateInput({}, 1001))
      expect(a.data!.signature).not.toBe(b.data!.signature)
    })

    it("maps customer fields to PayFast names and omits absent ones", async () => {
      const full = await make().initiatePayment(
        initiateInput({
          email: "buyer@example.com",
          name_first: "Ann",
          name_last: "Lee",
          cell_number: "0821234567",
        })
      )
      expect(full.data).toMatchObject({
        email_address: "buyer@example.com",
        name_first: "Ann",
        name_last: "Lee",
        cell_number: "0821234567",
      })
      expect(full.data).not.toHaveProperty("email")

      const bare = await make().initiatePayment(initiateInput())
      for (const k of ["email_address", "name_first", "name_last", "cell_number"]) {
        expect(bare.data).not.toHaveProperty(k)
      }
    })

    it.each(["return_url", "cancel_url"])("rejects a missing %s", async (key) => {
      await expect(
        make().initiatePayment(initiateInput({ [key]: undefined }))
      ).rejects.toThrow(key)
    })
  })

  describe("getPaymentStatus", () => {
    it("defaults to PENDING", async () => {
      const res = await make().getPaymentStatus({ data: {} })
      expect(res.status).toBe(PaymentSessionStatus.PENDING)
    })

    it("reflects a status stored on the session data", async () => {
      const res = await make().getPaymentStatus({
        data: { status: PaymentSessionStatus.AUTHORIZED },
      })
      expect(res.status).toBe(PaymentSessionStatus.AUTHORIZED)
    })
  })

  describe("getWebhookActionAndData (ITN)", () => {
    const pass = options.passphrase

    it("maps a correctly signed COMPLETE ITN to SUCCESSFUL with cents", async () => {
      const res = await make().getWebhookActionAndData(webhook(signedItn({}, pass)))
      expect(res).toEqual({
        action: PaymentActions.SUCCESSFUL,
        data: { session_id: "cart_123", amount: 15050 },
      })
    })

    it("maps a correctly signed FAILED ITN to FAILED", async () => {
      const res = await make().getWebhookActionAndData(
        webhook(signedItn({ payment_status: "FAILED" }, pass))
      )
      expect(res.action).toBe(PaymentActions.FAILED)
      expect(res.data).toMatchObject({ session_id: "cart_123" })
    })

    it("is case-insensitive on payment_status", async () => {
      const res = await make().getWebhookActionAndData(
        webhook(signedItn({ payment_status: "complete" }, pass))
      )
      expect(res.action).toBe(PaymentActions.SUCCESSFUL)
    })

    it("returns NOT_SUPPORTED for statuses it does not handle (e.g. PENDING, CANCELLED)", async () => {
      for (const payment_status of ["PENDING", "CANCELLED", "SOMETHING_NEW"]) {
        const res = await make().getWebhookActionAndData(
          webhook(signedItn({ payment_status }, pass))
        )
        expect(res.action).toBe(PaymentActions.NOT_SUPPORTED)
      }
    })

    it("rounds fractional-cent float artefacts correctly (e.g. 19.99 -> 1999)", async () => {
      const res = await make().getWebhookActionAndData(
        webhook(signedItn({ amount_gross: "19.99" }, pass))
      )
      expect(res.data!.amount).toBe(1999)
    })

    it("rejects an ITN whose signature does not match", async () => {
      const res = await make().getWebhookActionAndData(
        webhook({ ...baseItn(), signature: "0".repeat(32) })
      )
      expect(res.action).toBe(PaymentActions.FAILED)
      expect(res.data!.amount).toBe(0)
    })

    it("rejects an ITN tampered after signing (status flipped to COMPLETE)", async () => {
      const original = signedItn({ payment_status: "FAILED" }, pass)
      const res = await make().getWebhookActionAndData(
        webhook({ ...original, payment_status: "COMPLETE" })
      )
      expect(res.action).toBe(PaymentActions.FAILED)
    })

    it("rejects an ITN whose amount was tampered after signing", async () => {
      const original = signedItn({ amount_gross: "150.50" }, pass)
      const res = await make().getWebhookActionAndData(
        webhook({ ...original, amount_gross: "1.00" })
      )
      expect(res.action).toBe(PaymentActions.FAILED)
      expect(res.data!.amount).toBe(0)
    })

    it("rejects an ITN signed with the wrong passphrase", async () => {
      const res = await make().getWebhookActionAndData(
        webhook(signedItn({}, "other passphrase"))
      )
      expect(res.action).toBe(PaymentActions.FAILED)
    })

    it("rejects an ITN with no signature, keeping the session id for diagnostics", async () => {
      const res = await make().getWebhookActionAndData(webhook(baseItn()))
      expect(res).toEqual({
        action: PaymentActions.FAILED,
        data: { session_id: "cart_123", amount: 0 },
      })
    })

    it("rejects a payload with no data", async () => {
      const res = await make().getWebhookActionAndData({ rawData: "", headers: {} } as any)
      expect(res).toEqual({
        action: PaymentActions.FAILED,
        data: { session_id: "", amount: 0 },
      })
    })

    it("validates signatures without a passphrase when none is configured", async () => {
      const res = await make({ passphrase: undefined }).getWebhookActionAndData(
        webhook(signedItn())
      )
      expect(res.action).toBe(PaymentActions.SUCCESSFUL)
    })

    it("round-trips: initiatePayment data -> PayFast ITN -> SUCCESSFUL for the same session and amount", async () => {
      const svc = make()
      const init = await svc.initiatePayment(initiateInput({}, 24999))
      const itn = signedItn(
        {
          m_payment_id: init.id,
          amount_gross: init.data!.amount as string,
        },
        pass
      )
      const res = await svc.getWebhookActionAndData(webhook(itn))
      expect(res).toEqual({
        action: PaymentActions.SUCCESSFUL,
        data: { session_id: init.id, amount: 24999 },
      })
    })
  })

  // PayFast signs non-blank fields in documented/received order, NOT alphabetical.
  describe("PayFast signature ordering ", () => {
    it("outbound checkout signature uses PayFast's documented field order", async () => {
      const { data } = await make().initiatePayment(initiateInput({ email: "a@b.co" }))
      const { signature, ...rest } = data as Record<string, string>
      const documentedOrder = [
        "merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url",
        "name_first", "name_last", "email_address", "cell_number",
        "m_payment_id", "amount", "item_name", "item_description",
      ]
      const ordered: Record<string, string> = {}
      for (const k of documentedOrder) if (k in rest) ordered[k] = rest[k]
      expect(signature).toBe(signAsPayFastDoes(ordered, "secret phrase"))
    })

    it("ITN signature is verified in the order fields were received", async () => {
      // Real ITNs are not alphabetical: m_payment_id, pf_payment_id, payment_status, ...
      const itn = baseItn()
      const res = await make().getWebhookActionAndData(
        webhook({ ...itn, signature: signAsPayFastDoes(itn, "secret phrase") })
      )
      expect(res.action).toBe(PaymentActions.SUCCESSFUL)
    })
  })

  describe("not-yet-implemented lifecycle methods (stubs)", () => {
    // Medusa persists the returned `data` onto the PaymentSession and fails
    // ("non-undefined value to the property data") if it is missing.
    it("authorizePayment returns the session data so Medusa can persist it", async () => {
      const res = await make().authorizePayment({ data: { a: 1 }, context: {} } as any)
      expect(res.data).toEqual({ a: 1 })
    })

    it("authorizePayment currently always reports AUTHORIZED", async () => {
      const res = await make().authorizePayment({ data: {}, context: {} } as any)
      expect(res.status).toBe(PaymentSessionStatus.AUTHORIZED)
    })
  })
})
