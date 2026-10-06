import crypto from 'node:crypto';
import type { PayFastDataObject } from '../types'; // Import the type

/**
 * Generates the PayFast signature string from payment data, in object key order.
 * @param data The payment data object.
 * @param passphrase Optional passphrase.
 * @returns The signature string (before hashing).
 */
function generateSignatureString(data: PayFastDataObject, passphrase?: string): string {
  // PayFast signs non-blank fields in the order they appear (outbound: documented
  // field order; ITN: order received). Do NOT sort.
  const keys = Object.keys(data)
    .filter(key => data[key] !== null && data[key] !== undefined && data[key] !== '');

  const baseParams = keys.map(key => {
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
 * Validates the signature received in a PayFast ITN callback.
 * The passphrase (if configured) is appended, and fields are taken in the order received.
 * @param data The ITN POST data object.
 * @param expectedSignature The signature received in the ITN request.
 * @param passphrase The merchant's passphrase.
 * @returns True if the signature is valid, false otherwise.
 */
export function validatePayFastItnSignature(data: PayFastDataObject, expectedSignature: string, passphrase?: string): boolean {
  // Exclude the signature property using object destructuring
  const { signature, ...dataForSigning } = data;

  const signatureString = generateSignatureString(dataForSigning, passphrase);

  // Generate the expected hash
  const calculatedSignature = crypto.createHash('md5').update(signatureString).digest('hex');

  return calculatedSignature === expectedSignature;
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