export default class PayFastCustomIntegrationService extends AbstractPaymentProvider<PayFastOptions> {
  static identifier = PaymentProviderKeys.PAYFAST

  constructor(_, options) {
    super(_, options)
  }
}