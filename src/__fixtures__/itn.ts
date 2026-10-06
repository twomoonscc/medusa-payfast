import crypto from "node:crypto"

/**
 * Independent re-implementation of PayFast's signing rule, used by tests so
 * they never depend on the code under test to produce expected values.
 * Insertion-order keys, empty values dropped, urlencoded with '+' for spaces,
 * passphrase appended last.
 */
export const signForTest = (
  data: Record<string, unknown>,
  passphrase?: string
): string => {
  const enc = (v: unknown) => encodeURIComponent(String(v).trim()).replace(/%20/g, "+")
  const parts = Object.keys(data)
    .filter((k) => k !== "signature" && data[k] !== "" && data[k] != null)
      .map((k) => `${k}=${enc(data[k])}`)
  if (passphrase) parts.push(`passphrase=${enc(passphrase)}`)
  return crypto.createHash("md5").update(parts.join("&")).digest("hex")
}

export const baseItn = (overrides: Record<string, string> = {}) => ({
  m_payment_id: "cart_123",
  pf_payment_id: "1314806",
  payment_status: "COMPLETE",
  item_name: "Payment for Cart cart_123",
  item_description: "",
  amount_gross: "150.50",
  amount_fee: "-3.46",
  amount_net: "147.04",
  name_first: "Test",
  name_last: "Buyer",
  email_address: "sbtu01@payfast.co.za",
  merchant_id: "10000100",
  ...overrides,
})

export const signedItn = (
  overrides: Record<string, string> = {},
  passphrase?: string
) => {
  const data = baseItn(overrides)
  return { ...data, signature: signForTest(data, passphrase) }
}

/**
 * Signing exactly as PayFast documents it: non-blank fields in the order they
 * appear (outbound: documented field order; ITN: order received), NOT ordered.
 * Object insertion order is used as that order.
 */
export const signAsPayFastDoes = (
  data: Record<string, unknown>,
  passphrase?: string
): string => {
  const enc = (v: unknown) => encodeURIComponent(String(v).trim()).replace(/%20/g, "+")
  const parts = Object.keys(data)
    .filter((k) => k !== "signature" && data[k] !== "" && data[k] != null)
    .map((k) => `${k}=${enc(data[k])}`)
  if (passphrase) parts.push(`passphrase=${enc(passphrase)}`)
  return crypto.createHash("md5").update(parts.join("&")).digest("hex")
}
