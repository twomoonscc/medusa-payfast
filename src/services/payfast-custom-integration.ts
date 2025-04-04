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
import { type PayFastOptions, PaymentProviderKeys } from "../types"
import { generatePayFastSignature } from "../utils/payfast-utils"
import { v4 as uuidv4 } from 'uuid'

type PayFastDataObject = Record<string, string | number | boolean | undefined | null>;

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
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    // TODO: Implement PayFast logic
    return { status: PaymentSessionStatus.PENDING }
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

    const m_payment_id = resource_id ?? `medusa-${uuidv4()}`;
    const item_name = `Payment for ${resource_id ? 'Cart' : 'Transaction'} ${m_payment_id}`;

    const paymentData: PayFastDataObject = {
      merchant_id,
      merchant_key,
      return_url,
      cancel_url,
      notify_url,
      m_payment_id,
      amount: (Number(amount) / 100).toFixed(2),
      item_name,
      item_description,
    };

    if (name_first) paymentData.name_first = name_first;
    if (name_last) paymentData.name_last = name_last;
    if (email) paymentData.email_address = email;
    if (cell_number) paymentData.cell_number = cell_number;

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
    // TODO: Implement PayFast logic
    return { status: PaymentSessionStatus.AUTHORIZED }
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
    // TODO: Implement PayFast logic
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}