class PaymentService {
    constructor() {
      this.baseUrl = process.env.QUIKK_API_BASE_URL || "https://api.quikk.dev";
      this.apiKey = process.env.QUIKK_API_KEY || "mock-api-key";
    }
  
    async initiateMpesaPayment(request) {
      try {
        console.log("[mpesa] Initiating M-Pesa payment:", request);
  
        await new Promise((r) => setTimeout(r, 2000));
  
        if (!this.isValidPhoneNumber(request.phoneNumber)) {
          return { success: false, errorMessage: "Invalid phone number format. Use format: 254XXXXXXXXX" };
        }
        if (Number(request.amount) < 1) {
          return { success: false, errorMessage: "Amount must be at least KES 1" };
        }
  
        const checkoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
        return {
          success: true,
          checkoutRequestId,
          responseCode: "0",
          responseDescription: "Success. Request accepted for processing",
          customerMessage: `STK Push sent to ${request.phoneNumber}. Enter your M-Pesa PIN to complete the payment.`,
        };
      } catch (err) {
        console.error("[mpesa] initiate error:", err);
        return { success: false, errorMessage: "Payment service temporarily unavailable. Please try again." };
      }
    }
  
    async checkPaymentStatus(checkoutRequestId) {
      try {
        console.log("[mpesa] Checking status for:", checkoutRequestId);
        await new Promise((r) => setTimeout(r, 1000));
        const mockStatuses = [
          { resultCode: "0", resultDesc: "Processed successfully.", amount: 100, mpesaReceiptNumber: "NLJ7RT61SV", transactionDate: new Date().toISOString(), phoneNumber: "254712345678" },
          { resultCode: "1032", resultDesc: "Request cancelled by user" },
          { resultCode: "1037", resultDesc: "DS timeout user cannot be reached" },
        ];
        const status = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
        return { checkoutRequestId, ...status };
      } catch (err) {
        console.error("[mpesa] status error:", err);
        return { checkoutRequestId, resultCode: "1001", resultDesc: "Unable to check payment status" };
      }
    }
  
    isValidPhoneNumber(phoneNumber) {
      return /^254[0-9]{9}$/.test(phoneNumber);
    }
  
    formatPhoneNumber(phoneNumber) {
      let formatted = String(phoneNumber).replace(/\s+/g, "").replace(/[^\d]/g, "");
      if (formatted.startsWith("0")) formatted = "254" + formatted.substring(1);
      else if (formatted.startsWith("+254")) formatted = formatted.substring(1);
      else if (formatted.startsWith("254")) { /* ok */ }
      else if (formatted.length === 9) formatted = "254" + formatted;
      return formatted;
    }
  }
  
  module.exports = { paymentService: new PaymentService() };