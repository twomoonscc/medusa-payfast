export interface PayFastOptions {
  merchant_id: string;
  merchant_key: string;
  passphrase?: string; // Optional if not enabled in PayFast settings
  sandbox?: boolean; // Optional, defaults to false (production)
}

export enum PaymentProviderKeys {
  PAYFAST = "payfast",
  // Add other provider keys if needed
}
