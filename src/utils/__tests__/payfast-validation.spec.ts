import {
  validateRequestSignature,
  validateSender,
  validateSignatureLocally,
} from "../payfast-validation"
import { baseItn, signForTest } from "../../__fixtures__/itn"

describe("payfast-validation", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {})
    jest.spyOn(console, "error").mockImplementation(() => {})
    jest.spyOn(console, "info").mockImplementation(() => {})
    jest.spyOn(console, "debug").mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  describe("validateSender", () => {
    it.each([
      "www.payfast.co.za",
      "w1w.payfast.co.za",
      "w2w.payfast.co.za",
      "sandbox.payfast.co.za",
    ])("accepts %s", async (host) => {
      expect(await validateSender(host)).toEqual({ valid: true })
    })

    it.each([undefined, null, "", "evil.example.com", "www.payfast.co.za.evil.com"])(
      "rejects %p",
      async (host) => {
        expect(await validateSender(host as any)).toEqual({ valid: false })
      }
    )
  })

  describe("validateSignatureLocally", () => {
    const pass = "secret phrase"

    it("accepts a correctly signed payload", async () => {
      const data = baseItn({ item_description: "A print" })
      const res = await validateSignatureLocally(
        { ...data, signature: signForTest(data, pass) },
        pass
      )
      expect(res.valid).toBe(true)
    })

    // PayFast excludes blank fields from the signature string.
    it("ignores blank fields like PayFast does", async () => {
      const data = baseItn() // item_description is ""
      const res = await validateSignatureLocally(
        { ...data, signature: signForTest(data, pass) },
        pass
      )
      expect(res.valid).toBe(true)
    })

    it("rejects a tampered payload", async () => {
      const data = baseItn()
      const res = await validateSignatureLocally(
        { ...data, amount_gross: "1.00", signature: signForTest(data, pass) },
        pass
      )
      expect(res.valid).toBe(false)
    })

    it("rejects when the signature is missing", async () => {
      expect((await validateSignatureLocally(baseItn(), pass)).valid).toBe(false)
    })

    it("rejects when no passphrase is configured", async () => {
      const data = baseItn()
      const res = await validateSignatureLocally(
        { ...data, signature: signForTest(data) },
        undefined
      )
      expect(res.valid).toBe(false)
    })
  })

  describe("validateRequestSignature (server-side confirmation)", () => {
    const fetchMock = jest.fn()
    beforeEach(() => {
      fetchMock.mockReset()
      ;(global as any).fetch = fetchMock
    })

    const respond = (body: string, ok = true, status = 200) =>
      fetchMock.mockResolvedValue({
        ok,
        status,
        statusText: ok ? "OK" : "ERR",
        text: async () => body,
      })

    it("posts form-encoded data (signature last) to the sandbox endpoint", async () => {
      respond("VALID")
      const res = await validateRequestSignature(
        { ...baseItn(), signature: "abc" },
        true
      )
      expect(res.valid).toBe(true)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe("https://sandbox.payfast.co.za/eng/query/validate")
      expect(init.method).toBe("POST")
      const keys = [...(init.body as URLSearchParams).keys()]
      expect(keys[keys.length - 1]).toBe("signature")
    })

    it("uses the production endpoint when not sandbox", async () => {
      respond("VALID")
      await validateRequestSignature(baseItn(), false)
      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://www.payfast.co.za/eng/query/validate"
      )
    })

    it("treats VALID case-insensitively with whitespace", async () => {
      respond(" valid\n")
      expect((await validateRequestSignature(baseItn())).valid).toBe(true)
    })

    it("is invalid when PayFast answers INVALID", async () => {
      respond("INVALID")
      expect((await validateRequestSignature(baseItn())).valid).toBe(false)
    })

    it("is invalid on a non-2xx response", async () => {
      respond("nope", false, 500)
      expect((await validateRequestSignature(baseItn())).valid).toBe(false)
    })

    it("is invalid (not thrown) on network failure", async () => {
      fetchMock.mockRejectedValue(new Error("ECONNRESET"))
      expect((await validateRequestSignature(baseItn())).valid).toBe(false)
    })
  })
})
