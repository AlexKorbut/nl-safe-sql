/**
 * YooKassa integration for RU payments (Wave 3):
 * Russian payment gateway for ruble transactions.
 */

export interface YooKassaConfig {
  shopId: string;
  secretKey: string;
  baseUrl?: string;
}

export interface PaymentRequest {
  amount: number;
  currency: "RUB";
  description: string;
  returnUrl: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  id: string;
  status: "pending" | "succeeded" | "canceled" | "waiting_for_capture";
  amount: { value: string; currency: "RUB" };
  created_at: string;
  confirmation: { type: "redirect"; confirmation_url: string };
}

export class YooKassaProvider {
  private shopId: string;
  private secretKey: string;
  private baseUrl: string = "https://api.yookassa.ru/v3";

  constructor(config: YooKassaConfig) {
    this.shopId = config.shopId;
    this.secretKey = config.secretKey;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const body = {
      amount: { value: (request.amount / 100).toFixed(2), currency: request.currency },
      description: request.description,
      return_url: request.returnUrl,
      metadata: request.metadata,
      confirmation: { type: "redirect" },
    };

    const res = await fetch(`${this.baseUrl}/payments`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString("base64")}`,
        "content-type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`YooKassa error: ${res.status}`);
    }

    return res.json();
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    const res = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      headers: {
        authorization: `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString("base64")}`,
      },
    });

    if (!res.ok) {
      throw new Error(`YooKassa error: ${res.status}`);
    }

    return res.json();
  }

  validateWebhook(body: string, signature: string, secret: string): boolean {
    const hmac = require("crypto").createHmac("sha256", secret);
    hmac.update(body);
    return hmac.digest("base64") === signature;
  }
}
