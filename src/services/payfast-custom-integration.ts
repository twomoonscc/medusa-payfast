import {
  AbstractPaymentProvider,
  PaymentSessionStatus,
  PaymentActions,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  type PayFastOptions,
  PaymentProviderKeys,
  type PayFastDataObject
} from "../types"
import {
  generatePayFastSignature,
  validatePayFastItnSignature
} from "../utils/payfast-utils"
import { v4 as uuidv4 } from 'uuid'

export default class PayFastCustomIntegrationService extends AbstractPaymentProvider<PayFastOptions> {
  static identifier = PaymentProviderKeys.PAYFAST

  protected readonly options_: PayFastOptions;

  constructor(_, options: PayFastOptions) {
    super(_, options)
    this.options_ = options;

    if (!options.merchant_id) {
        throw new Error("PayFast merchant_id is required");
    }
    if (!options.merchant_key) {
        throw new Error("PayFast merchant_key is required");
    }
  }

  async getPaymentStatus(
    { data }: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    // PayFast primarily uses ITN webhooks for status updates.
    // This method reflects the last known status, often managed by Medusa core
    // based on webhook results. Without a direct query API or webhook updates yet,
    // we return PENDING as the default assumption after initiation.
    // TODO: Potentially integrate with Medusa's internal state if needed later.
    const paymentStatus = data?.status as PaymentSessionStatus ?? PaymentSessionStatus.PENDING;
    // We currently don't query PayFast here, so we return the assumed status.
    return { status: paymentStatus, data: data ?? {} };
  }

  async initiatePayment({
    amount,
    currency_code,
    data,
    context,
  }: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const { merchant_id, merchant_key, passphrase } = this.options_;

    const return_url = data?.return_url as string | undefined;
    const cancel_url = data?.cancel_url as string | undefined;
    const notify_url = data?.notify_url as string | undefined;
    const resource_id = data?.resource_id as string | undefined;
    const item_description = data?.item_description as string | undefined;
    const email = data?.email as string | undefined;
    const name_first = data?.name_first as string | undefined;
    const name_last = data?.name_last as string | undefined;
    const cell_number = data?.cell_number as string | undefined;

    if (!return_url) {
      throw new Error("PayFast initiatePayment requires 'return_url' in the data payload.");
    }
    if (!cancel_url) {
      throw new Error("PayFast initiatePayment requires 'cancel_url' in the data payload.");
    }

    // Medusa's webhook workflow finds the session by id, so PayFast must echo it back.
    const session_id =
      (data?.session_id as string | undefined) ?? context?.idempotency_key
    const m_payment_id = session_id ?? resource_id ?? `medusa-${uuidv4()}`;
    const item_name = `Payment for ${resource_id ? 'Cart' : 'Transaction'} ${m_payment_id}`;

    // Key order matters: PayFast signs fields in its documented order.
    const paymentData: PayFastDataObject = {
      merchant_id,
      merchant_key,
      return_url,
      cancel_url,
      notify_url,
      name_first,
      name_last,
      email_address: email,
      cell_number,
      m_payment_id,
      amount: (Number(amount) / 100).toFixed(2),
      item_name,
      item_description,
    };

    for (const key of Object.keys(paymentData)) {
      if (paymentData[key] === undefined || paymentData[key] === "") delete paymentData[key];
    }

    const signature = generatePayFastSignature(paymentData, passphrase);

    paymentData.signature = signature;

    return {
      id: m_payment_id,
      data: paymentData,
    };
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    // PayFast has no separate authorize step; the ITN already confirmed payment.
    // Medusa persists `data` onto the session and rejects undefined.
    return { status: PaymentSessionStatus.AUTHORIZED, data: input.data ?? {} }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    // TODO: Implement PayFast logic
    return {}
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    // TODO: Implement PayFast logic
    return { data: {} } // Adjust return based on actual PayFast response
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    // TODO: Implement PayFast logic
    return {}
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    // TODO: Implement PayFast logic
    return { data: {} } // Adjust return based on actual PayFast response
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    // TODO: Implement PayFast logic
    return { data: {} } // Adjust return based on actual PayFast response
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    // TODO: Implement PayFast logic
    return { data: {} } // Adjust return based on actual PayFast response
  }

  async getWebhookActionAndData(
    webhookData: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const { passphrase } = this.options_;
    const itnData = webhookData?.data as PayFastDataObject;

    if (!itnData) {
        console.error("PayFast ITN Error: Missing ITN data payload.");
        // Return required fields even on failure
        return {
            action: PaymentActions.FAILED,
            data: { session_id: "", amount: 0 }
        };
    }

    // --- 1. Validate Signature --- 
    const receivedSignature = itnData.signature as string;
    const m_payment_id_for_error = itnData.m_payment_id as string | undefined;

    if (!receivedSignature) {
        console.error(`PayFast ITN Error: Missing signature for m_payment_id: ${m_payment_id_for_error}`);
        return {
            action: PaymentActions.FAILED,
            // Ensure session_id is a string, provide amount
            data: { session_id: m_payment_id_for_error ?? "", amount: 0 }
        };
    }

    const isSignatureValid = validatePayFastItnSignature(itnData, receivedSignature, passphrase);

    if (!isSignatureValid) {
      console.error(`PayFast ITN Error: Invalid signature for m_payment_id: ${m_payment_id_for_error}`);
      return {
          action: PaymentActions.FAILED,
          // Ensure session_id is a string, provide amount
          data: { session_id: m_payment_id_for_error ?? "", amount: 0 }
      };
    }

    // --- 2. Extract Key Data --- 
    const paymentStatus = itnData.payment_status as string;
    const m_payment_id = itnData.m_payment_id as string; // Should be present if signature is valid
    const amount_gross = itnData.amount_gross as string;

    // --- 3. Determine Medusa Action --- 
    let action: PaymentActions;
    switch (paymentStatus?.toUpperCase()) {
      case 'COMPLETE':
        action = PaymentActions.SUCCESSFUL;
        break;
      case 'FAILED':
        action = PaymentActions.FAILED;
        break;
      default:
        console.warn(`PayFast ITN: Unhandled payment status: ${paymentStatus} for m_payment_id: ${m_payment_id}`);
        action = PaymentActions.NOT_SUPPORTED; // Or FAILED depending on desired handling
        break;
    }

    // --- 4. Return Result --- 
    // Ensure required fields are present and correctly typed
    const amountInCents = Math.round(Number.parseFloat(amount_gross || '0') * 100);

    return {
      action,
      data: {
        session_id: m_payment_id ?? "", // Ensure string type
        amount: amountInCents,
        // raw: itnData, // Removed: Not part of WebhookActionData type
      },
    };
  }
}