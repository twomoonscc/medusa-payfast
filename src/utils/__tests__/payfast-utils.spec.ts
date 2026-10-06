import crypto from "node:crypto";
import {
  generatePayFastSignature,
  validatePayFastItnSignature,
  buildPayFastUrl,
} from "../payfast-utils";
import type { PayFastDataObject } from "../../types";

// Helper function to create MD5 hash for comparison in tests
const createMd5Hash = (data: string): string => {
  return crypto.createHash("md5").update(data).digest("hex");
};

describe("PayFast Utils", () => {
  describe("generatePayFastSignature", () => {
    const basicData = {
      merchant_id: "10000100",
      merchant_key: "46f0cd694581a",
      return_url: "http://test.com/success",
      cancel_url: "http://test.com/cancel",
      notify_url: "http://test.com/notify",
      name_first: "First",
      name_last: "Last",
      email_address: "test@test.com",
      m_payment_id: "test_123",
      amount: "100.00",
      item_name: "Test Item",
    };

    const passphrase = "saltykey";

    it("should generate the correct signature without passphrase", () => {
      // Expected string: key=value pairs in insertion order, URL encoded, joined by &
      const expectedStringToSign =
        "merchant_id=10000100&merchant_key=46f0cd694581a&return_url=http%3A%2F%2Ftest.com%2Fsuccess&cancel_url=http%3A%2F%2Ftest.com%2Fcancel&notify_url=http%3A%2F%2Ftest.com%2Fnotify&name_first=First&name_last=Last&email_address=test%40test.com&m_payment_id=test_123&amount=100.00&item_name=Test+Item";
      const expectedSignature = createMd5Hash(expectedStringToSign);
      const calculatedSignature = generatePayFastSignature(basicData);
      expect(calculatedSignature).toBe(expectedSignature);
    });

    it("should generate the correct signature with passphrase", () => {
      const expectedStringToSignWithPhrase =
        "merchant_id=10000100&merchant_key=46f0cd694581a&return_url=http%3A%2F%2Ftest.com%2Fsuccess&cancel_url=http%3A%2F%2Ftest.com%2Fcancel&notify_url=http%3A%2F%2Ftest.com%2Fnotify&name_first=First&name_last=Last&email_address=test%40test.com&m_payment_id=test_123&amount=100.00&item_name=Test+Item&passphrase=saltykey";
      const expectedSignature = createMd5Hash(expectedStringToSignWithPhrase);
      const calculatedSignature = generatePayFastSignature(
        basicData,
        passphrase
      );
      expect(calculatedSignature).toBe(expectedSignature);
    });

    it("should correctly handle spaces and URL encode values", () => {
      const dataWithSpaces = {
        ...basicData,
        item_name: "Test Item With Spaces",
        item_description: "A description needing encoding",
      };
      const expectedStringToSign =
        "merchant_id=10000100&merchant_key=46f0cd694581a&return_url=http%3A%2F%2Ftest.com%2Fsuccess&cancel_url=http%3A%2F%2Ftest.com%2Fcancel&notify_url=http%3A%2F%2Ftest.com%2Fnotify&name_first=First&name_last=Last&email_address=test%40test.com&m_payment_id=test_123&amount=100.00&item_name=Test+Item+With+Spaces&item_description=A+description+needing+encoding";
      const expectedSignature = createMd5Hash(expectedStringToSign);
      const calculatedSignature = generatePayFastSignature(dataWithSpaces);
      expect(calculatedSignature).toBe(expectedSignature);
    });

    it("should ignore null, undefined, and empty string values", () => {
      const dataWithEmpty = {
        ...basicData,
        custom_str1: "", // Should be ignored
        custom_int1: null, // Should be ignored
        custom_int2: undefined, // Should be ignored
      };
      // Expected string should be the same as the basic data test without passphrase
      const expectedStringToSign =
        "merchant_id=10000100&merchant_key=46f0cd694581a&return_url=http%3A%2F%2Ftest.com%2Fsuccess&cancel_url=http%3A%2F%2Ftest.com%2Fcancel&notify_url=http%3A%2F%2Ftest.com%2Fnotify&name_first=First&name_last=Last&email_address=test%40test.com&m_payment_id=test_123&amount=100.00&item_name=Test+Item";
      const expectedSignature = createMd5Hash(expectedStringToSign);
      const calculatedSignature = generatePayFastSignature(dataWithEmpty);
      expect(calculatedSignature).toBe(expectedSignature);
    });
  });

  describe('validatePayFastItnSignature', () => {
    const itnDataBase = {
        m_payment_id: '8d00bf49-e979-4004-a08d-ebe1886ac177',
        pf_payment_id: '1314806',
        payment_status: 'COMPLETE',
        item_name: 'Test Product',
        item_description: '',
        amount_gross: '30.00',
        amount_fee: '-2.30',
        amount_net: '27.70',
        custom_str1: '',
        custom_str2: '',
        custom_str3: '',
        custom_str4: '',
        custom_str5: '',
        custom_int1: '',
        custom_int2: '',
        custom_int3: '',
        custom_int4: '',
        custom_int5: '',
        name_first: 'Test',
        name_last: 'User',
        email_address: 'sbtu01%40payfast.co.za',
        merchant_id: '10000100',
    };
    const passphrase = 'saltykey';

    it('should return true for a valid signature with passphrase', () => {
      // Calculate the correct signature for the base data + passphrase
      const correctStringToSign = generateSignatureStringForTest(itnDataBase, passphrase);
      const correctSignature = createMd5Hash(correctStringToSign);

      const itnDataWithSig = { ...itnDataBase, signature: correctSignature };
      const isValid = validatePayFastItnSignature(itnDataWithSig, correctSignature, passphrase);
      expect(isValid).toBe(true);
    });

    it('should return true for a valid signature without passphrase', () => {
      // Calculate the correct signature for the base data (no passphrase)
      const correctStringToSign = generateSignatureStringForTest(itnDataBase); // No passphrase
      const correctSignature = createMd5Hash(correctStringToSign);

      const itnDataWithSig = { ...itnDataBase, signature: correctSignature };
      // Validate without passing passphrase to the validator
      const isValid = validatePayFastItnSignature(itnDataWithSig, correctSignature);
      expect(isValid).toBe(true);
    });

    it('should return false for an invalid signature', () => {
      const invalidSignature = 'invalid_signature_hash';
      const itnDataWithSig = { ...itnDataBase, signature: invalidSignature };
      const isValid = validatePayFastItnSignature(itnDataWithSig, invalidSignature, passphrase);
      expect(isValid).toBe(false);
    });

    it('should return false if expected signature does not match calculated', () => {
       // Calculate the correct signature
      const correctStringToSign = generateSignatureStringForTest(itnDataBase, passphrase);
      const correctSignature = createMd5Hash(correctStringToSign);
      const itnDataWithWrongSig = { ...itnDataBase, signature: 'some_other_hash' }; // Data contains wrong sig

       // We pass the *wrong* signature as the one we expect
      const isValid = validatePayFastItnSignature(itnDataWithWrongSig, 'some_other_hash', passphrase);
      // The function *should* calculate the correct one based on itnDataWithWrongSig (excluding signature field)
      // and compare it to 'some_other_hash', which will fail.
      expect(isValid).toBe(false);
    });

     it('should ignore the signature field in data when calculating expected hash', () => {
      // Calculate the correct signature for the base data + passphrase (without the signature field)
      const correctStringToSign = generateSignatureStringForTest(itnDataBase, passphrase);
      const correctSignature = createMd5Hash(correctStringToSign);

      // Put a *different* signature into the data object itself
      const itnDataWithIncorrectSigField = { ...itnDataBase, signature: 'this_should_be_ignored' };

      // Validate against the *correct* expected signature
      const isValid = validatePayFastItnSignature(itnDataWithIncorrectSigField, correctSignature, passphrase);

      // It should pass because the validator ignores itnDataWithIncorrectSigField.signature
      // when recalculating the hash to compare against correctSignature.
      expect(isValid).toBe(true);
    });

  });

  describe('buildPayFastUrl', () => {
    const paymentData = {
      merchant_id: '10000100',
      merchant_key: '46f0cd694581a',
      return_url: 'http://test.com/success',
      cancel_url: 'http://test.com/cancel',
      notify_url: 'http://test.com/notify',
      name_first: 'First',
      name_last: 'Last',
      email_address: 'test@test.com',
      m_payment_id: 'test_123',
      amount: '100.00',
      item_name: 'Test Item with spaces',
      signature: 'generated_signature_hash',
    };

    it('should build the correct production URL', () => {
      const expectedBase = 'https://www.payfast.co.za/eng/process';
      // Note: Query string for URL uses standard encodeURIComponent, not the space -> + replacement
      const expectedQuery = 
        'merchant_id=10000100&merchant_key=46f0cd694581a&return_url=http%3A%2F%2Ftest.com%2Fsuccess&cancel_url=http%3A%2F%2Ftest.com%2Fcancel&notify_url=http%3A%2F%2Ftest.com%2Fnotify&name_first=First&name_last=Last&email_address=test%40test.com&m_payment_id=test_123&amount=100.00&item_name=Test%20Item%20with%20spaces&signature=generated_signature_hash';
      const expectedUrl = `${expectedBase}?${expectedQuery}`;

      const generatedUrl = buildPayFastUrl(paymentData, false); // sandbox = false (default)
      // Use URLSearchParams to compare queries irrespective of parameter order
      const generatedParams = new URL(generatedUrl).searchParams;
      const expectedParams = new URL(expectedUrl).searchParams;

      expect(generatedUrl.startsWith(expectedBase)).toBe(true);
      expect(generatedParams.toString()).toEqual(expectedParams.toString());
    });

    it('should build the correct sandbox URL', () => {
      const expectedBase = 'https://sandbox.payfast.co.za/eng/process';
       const expectedQuery = 
        'merchant_id=10000100&merchant_key=46f0cd694581a&return_url=http%3A%2F%2Ftest.com%2Fsuccess&cancel_url=http%3A%2F%2Ftest.com%2Fcancel&notify_url=http%3A%2F%2Ftest.com%2Fnotify&name_first=First&name_last=Last&email_address=test%40test.com&m_payment_id=test_123&amount=100.00&item_name=Test%20Item%20with%20spaces&signature=generated_signature_hash';
      const expectedUrl = `${expectedBase}?${expectedQuery}`;

      const generatedUrl = buildPayFastUrl(paymentData, true); // sandbox = true
      const generatedParams = new URL(generatedUrl).searchParams;
      const expectedParams = new URL(expectedUrl).searchParams;

      expect(generatedUrl.startsWith(expectedBase)).toBe(true);
      expect(generatedParams.toString()).toEqual(expectedParams.toString());
    });

    it('should correctly URL encode special characters in values', () => {
       const dataWithSpecialChars = {
         ...paymentData,
         item_name: 'Item with & and =',
         custom_str1: 'value/with?slashes#fragment',
       };
       const expectedBase = 'https://www.payfast.co.za/eng/process';
       const generatedUrl = buildPayFastUrl(dataWithSpecialChars); // Production default
       const generatedParams = new URL(generatedUrl).searchParams;

       expect(generatedUrl.startsWith(expectedBase)).toBe(true);
       expect(generatedParams.get('item_name')).toBe('Item with & and ='); // Test decoded value
       expect(generatedParams.get('custom_str1')).toBe('value/with?slashes#fragment'); // Test decoded value
       // Check raw query string parts for correct encoding
       expect(generatedUrl).toContain('item_name=Item%20with%20%26%20and%20%3D');
       expect(generatedUrl).toContain('custom_str1=value%2Fwith%3Fslashes%23fragment');
    });

  });
});

// Need a way to replicate the internal generateSignatureString logic for testing validation
// as it's not exported directly.
const generateSignatureStringForTest = (data: PayFastDataObject, passphrase?: string): string => {
  const sortedKeys = Object.keys(data)
    .filter(key => data[key] !== null && data[key] !== undefined && data[key] !== '');

  const baseParams = sortedKeys.map(key => {
    const valueString = String(data[key]).trim();
    const encodedValue = encodeURIComponent(valueString).replace(/%20/g, '+');
    return `${key}=${encodedValue}`;
  });

  const signatureParams = passphrase
    ? [...baseParams, `passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`]
    : baseParams;

  return signatureParams.join('&');
};
