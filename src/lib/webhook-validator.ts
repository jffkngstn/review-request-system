// src/lib/webhook-validator.ts
import crypto from 'crypto';

export class WebhookValidator {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  validateSignature(payload: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', this.secret);
    const calculatedSignature = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  }

  validateTimestamp(timestamp: string): boolean {
    const eventTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    const fiveMinutesMs = 5 * 60 * 1000;
    return Math.abs(currentTime - eventTime) < fiveMinutesMs;
  }
}