import crypto from 'node:crypto';

// Define a more specific type for payment data
type PayFastDataValue = string | number | boolean | undefined | null;
type PayFastDataObject = Record<string, PayFastDataValue>;

/**
 * Generates the PayFast signature string from payment data.
 * @param data The payment data object.
 * @param passphrase Optional passphrase.
 * @returns The signature string (before hashing).
 */
function generateSignatureString(data: PayFastDataObject, passphrase?: string): string {
  const sortedKeys = Object.keys(data)
    .filter(key => data[key] !== null && data[key] !== undefined && data[key] !== '') // Filter out empty/null values
    .sort();

  const baseParams = sortedKeys.map(key => {
    // URL encode values and replace spaces with '+'
    // Ensure value is treated as string for encoding
    const valueString = String(data[key]).trim();
    const encodedValue = encodeURIComponent(valueString).replace(/%20/g, '+');
    return `${key}=${encodedValue}`;
  });

  // Conditionally add passphrase using const
  const signatureParams = passphrase
    ? [...baseParams, `passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`]
    : baseParams;

  return signatureParams.join('&');
}

/**
 * Generates the MD5 signature for a PayFast request.
 * @param data The payment data object.
 * @param passphrase Optional passphrase.
 * @returns The MD5 signature hash.
 */
export function generatePayFastSignature(data: PayFastDataObject, passphrase?: string): string {
  const signatureString = generateSignatureString(data, passphrase);
  return crypto.createHash('md5').update(signatureString).digest('hex');
}

/**
 * Constructs the PayFast processing URL.
 * @param paymentData The payment data including signature.
 * @param sandbox Whether to use the sandbox URL.
 * @returns The full PayFast processing URL.
 */
export function buildPayFastUrl(paymentData: PayFastDataObject, sandbox?: boolean): string {
  const baseUrl = sandbox
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';

  const queryString = Object.keys(paymentData)
    .map(key => {
      const valueString = String(paymentData[key]); // Ensure value is a string
      const encodedValue = encodeURIComponent(valueString); // Standard URL encoding is sufficient here
      return `${key}=${encodedValue}`;
    })
    .join('&');

  return `${baseUrl}?${queryString}`;
}