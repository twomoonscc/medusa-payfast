import PayFastCustomIntegrationService from "../payfast-custom-integration";
import { generatePayFastSignature } from "../../utils/payfast-utils";
import { v4 as uuidv4 } from "uuid";
import type { PayFastOptions, PayFastDataObject } from "../../types";
import type {
  InitiatePaymentInput,
} from "@medusajs/framework/types";

jest.mock("../../utils/payfast-utils", () => ({
  generatePayFastSignature: jest.fn(),
  validatePayFastItnSignature: jest.fn(),
}));
jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

const MockAbstractPaymentProvider = jest.fn();
Object.setPrototypeOf(
  PayFastCustomIntegrationService,
  MockAbstractPaymentProvider
);

describe("PayFastCustomIntegrationService", () => {
  let service: PayFastCustomIntegrationService;
  let mockOptions: PayFastOptions;

  beforeEach(() => {
    mockOptions = {
      merchant_id: "10000100",
      merchant_key: "a-fake-merchant-key",
      passphrase: "secret",
      sandbox: true,
      return_url: "http://dummy.com/return",
      cancel_url: "http://dummy.com/cancel",
      notify_url: "http://dummy.com/notify",
    };
    service = new PayFastCustomIntegrationService({}, mockOptions);
  });

  // ... test: should generate uuid ...
  // ... test: should throw if return_url missing ...
  // ... test: should throw if cancel_url missing ...

  describe("initiatePayment", () => {
    let service: PayFastCustomIntegrationService;

    beforeEach(() => {
      service = new PayFastCustomIntegrationService({}, mockOptions);
      // Explicitly reset mock implementation and set return value for each test
      (generatePayFastSignature as jest.Mock)
        .mockReset()
        .mockReturnValue("mock_signature");
      (uuidv4 as jest.Mock).mockReset().mockReturnValue("mock-uuid-1234"); // Also reset uuid mock
    });

    it("should handle missing optional customer details gracefully", async () => {
      // Explicitly type the input to help TS
      const inputWithoutOptional: InitiatePaymentInput = {
        amount: 5000,
        currency_code: "ZAR",
        data: {
          // Ensure required fields are present even when testing optional ones
          return_url: "http://store.com/return",
          cancel_url: "http://store.com/cancel",
          notify_url: "http://api.com/notify",
          resource_id: "cart_123",
          // Set optional fields to undefined
          item_description: undefined,
          email: undefined,
          name_first: undefined,
          name_last: undefined,
          cell_number: undefined,
        },
        context: {},
      };

      // Assign data to variable and check existence to avoid non-null assertion
      const currentData = inputWithoutOptional.data;
      if (!currentData) {
        throw new Error(
          "Test setup error: inputWithoutOptional.data is missing"
        );
      }

      const expectedPaymentDataBase: PayFastDataObject = {
        merchant_id: mockOptions.merchant_id,
        merchant_key: mockOptions.merchant_key,
        return_url: currentData.return_url as string,
        cancel_url: currentData.cancel_url as string,
        notify_url: currentData.notify_url as string,
        m_payment_id: currentData.resource_id as string,
        amount: "50.00",
        item_name: `Payment for Cart ${currentData.resource_id as string}`,
        item_description: undefined,
      };

      // Call initiatePayment only ONCE and capture the result
      const result = await service.initiatePayment(inputWithoutOptional);

      // Use expect.objectContaining to avoid potential object reference issues
      expect(generatePayFastSignature).toHaveBeenCalledWith(
        expect.objectContaining(expectedPaymentDataBase),
        mockOptions.passphrase
      );

      // Check the final returned data from the single call
      expect(result.data).toEqual({
        merchant_id: mockOptions.merchant_id,
        merchant_key: mockOptions.merchant_key,
        return_url: currentData.return_url as string,
        cancel_url: currentData.cancel_url as string,
        notify_url: currentData.notify_url as string,
        m_payment_id: currentData.resource_id as string,
        amount: "50.00",
        item_name: `Payment for Cart ${currentData.resource_id as string}`,
        item_description: undefined,
        signature: "mock_signature", // The mock value should be in the result
      });
    });
  });
});
