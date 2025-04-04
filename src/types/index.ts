export interface PayFastOptions {
  merchant_id: string
  merchant_key: string
  passphrase?: string
  sandbox: boolean
  return_url: string
  cancel_url: string
  notify_url: string
}

export enum PaymentProviderKeys {
  PAYFAST = "payfast",
  // Add other provider keys if needed
}

// Represents the possible scalar types for PayFast data fields
export type PayFastDataValue = string | number | boolean | undefined | null;

// Represents the data object sent to/received from PayFast (excluding nested objects)
export type PayFastDataObject = Record<string, PayFastDataValue>;

// export interface PayFastContext {
//   resource_id: string
//   amount: number
//   email?: string
//   order_id?: string
//   cart?: {
//     id: string
//     total: number
//     email?: string
//     billing_address?: {
//       first_name?: string
//       last_name?: string
//       email?: string
//     }
//   }
// }