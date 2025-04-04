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

export default class PayFastCustomIntegrationService extends AbstractPaymentProvider<PayFastOptions> {
  static identifier = PaymentProviderKeys.PAYFAST

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    // TODO: Implement PayFast logic
    return { status: PaymentSessionStatus.PENDING }
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    // TODO: Implement PayFast logic
    throw new Error("Method not implemented.")
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