import crypto from "node:crypto";

// Define the list of valid PayFast sender domains/URLs
const validSenders: string[] = [
  "www.payfast.co.za",
  "w1w.payfast.co.za",
  "w2w.payfast.co.za",
  "sandbox.payfast.co.za",
  "https://www.payfast.co.za", // Keep the HTTPS version just in case
];

/**
 * Checks if the referrer URL is a known PayFast domain.
 * This might be part of ITN validation.
 * @param referer - The referrer URL string from request headers.
 * @returns A promise resolving to an object indicating validity.
 */
export const validateSender = async (referer: string | undefined | null) => {
  // Check if the referer is provided and is included in the list of valid senders
  if (referer && validSenders.includes(referer)) {
    return { valid: true };
  }

  // Log if the referer is invalid or missing for debugging purposes
  if (referer) {
    console.warn(`[PayFast Validation] Invalid referer received: ${referer}`);
  } else {
    console.warn("[PayFast Validation] Referer header missing.");
  }
  return { valid: false };
};

/**
 * Validates ITN data by sending it back to PayFast's validation endpoint.
 * Note: Standard ITN validation usually involves local signature calculation.
 * Use `validateSignatureLocally` for that approach.
 * @param payload - The ITN payload received from PayFast.
 * @param isSandbox - Flag indicating if sandbox mode is active.
 * @returns A promise resolving to an object indicating validity.
 */
export const validateRequestSignature = async (
  payload: Record<string, unknown>,
  isSandbox = false
): Promise<{ valid: boolean }> => {
  const form = new URLSearchParams();

  const sortedKeys = Object.keys(payload).sort();
  for (const key of sortedKeys) {
    if (
      key !== "signature" &&
      payload[key] !== undefined &&
      payload[key] !== null
    ) {
      form.append(key, String(payload[key]));
    }
  }

  if (payload.signature) {
    form.append("signature", String(payload.signature));
  }

  try {
    const validationUrl = isSandbox
      ? "https://sandbox.payfast.co.za/eng/query/validate"
      : "https://www.payfast.co.za/eng/query/validate";

    console.debug(
      `[PayFast Validation] Sending validation request to: ${validationUrl}`
    );

    const response = await fetch(validationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: form,
    });

    if (!response.ok) {
      console.error(
        `[PayFast Validation] Request failed with status: ${response.status} ${response.statusText}`
      );
      const responseBody = await response.text();
      console.error(`[PayFast Validation] Response body: ${responseBody}`);
      return { valid: false };
    }

    const resultText = await response.text();
    console.debug(`[PayFast Validation] Received response: ${resultText}`);

    if (resultText.trim().toUpperCase() === "VALID") {
      return { valid: true };
    }

    console.warn(
      `[PayFast Validation] Validation failed. PayFast responded: ${resultText}`
    );
    return { valid: false };
  } catch (error) {
    console.error(
      "[PayFast Validation] Error during validation request:",
      error
    );
    return { valid: false };
  }
};

/**
 * Validates the PayFast ITN signature locally using the received data and passphrase.
 * This is the standard and recommended method for ITN validation.
 * @param payload - The complete ITN payload received from PayFast (as a key-value object).
 * @param passphrase - The merchant's PayFast passphrase (optional, needed for validation).
 * @returns A promise resolving to an object indicating validity.
 */
export const validateSignatureLocally = async (
  payload: Record<string, unknown>,
  passphrase?: string | null
): Promise<{ valid: boolean }> => {
  const receivedSignature = payload.signature as string;

  if (!receivedSignature) {
    console.warn(
      "[PayFast Validation] ITN payload missing 'signature'. Cannot validate locally."
    );
    return { valid: false };
  }

  if (!passphrase) {
    console.warn(
      "[PayFast Validation] Passphrase not configured. Cannot validate PayFast signature locally."
    );
    return { valid: false };
  }

  let paramString = "";
  const sortedKeys = Object.keys(payload)
    .filter((k) => k !== "signature")
    .sort();

  for (const key of sortedKeys) {
    const value =
      payload[key] === null || payload[key] === undefined ? "" : payload[key];
    paramString += `${key}=${encodeURIComponent(String(value).trim()).replace(
      /%20/g,
      "+"
    )}&`;
  }

  paramString = paramString.slice(0, -1);

  const encodedPassphrase = encodeURIComponent(passphrase.trim()).replace(
    /%20/g,
    "+"
  );
  paramString += `&passphrase=${encodedPassphrase}`;

  const calculatedSignature = crypto
    .createHash("md5")
    .update(paramString)
    .digest("hex");

  if (calculatedSignature === receivedSignature) {
    console.info("[PayFast Validation] Local signature validation successful.");
    return { valid: true };
  }

  console.warn("[PayFast Validation] Local signature mismatch.");
  console.debug(`  Received:    ${receivedSignature}`);
  console.debug(`  Calculated:  ${calculatedSignature}`);
  return { valid: false };
};
