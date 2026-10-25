import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || 'zenith-n8n-webhook-hmac-key-2026';

export interface ZenithWebhookPayload {
  eventId: string;
  eventType: 'focus_session.completed' | 'weekly_digest.generated' | 'system.maintenance';
  timestamp: string;
  idempotencyKey: string;
  data: Record<string, any>;
}

export class N8nWebhookService {
  /**
   * Compute HMAC SHA-256 signature for outgoing webhook payload.
   */
  public static generateSignature(payloadString: string): string {
    return crypto.createHmac('sha256', N8N_SECRET).update(payloadString).digest('hex');
  }

  /**
   * Dispatch an asynchronous event payload to configured n8n webhook endpoint.
   */
  public static async dispatchEvent(
    endpointUrl: string,
    eventType: ZenithWebhookPayload['eventType'],
    data: Record<string, any>
  ): Promise<{ success: boolean; eventId: string; status?: number }> {
    const eventId = `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const idempotencyKey = `idem_${eventId}`;
    const payload: ZenithWebhookPayload = {
      eventId,
      eventType,
      timestamp: new Date().toISOString(),
      idempotencyKey,
      data,
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString);

    if (!endpointUrl) {
      return { success: false, eventId, status: 0 };
    }

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zenith-Event-Id': eventId,
          'X-Zenith-Signature': signature,
          'X-Zenith-Idempotency-Key': idempotencyKey,
        },
        body: payloadString,
      });

      return {
        success: response.ok,
        eventId,
        status: response.status,
      };
    } catch (err: any) {
      console.warn('n8n webhook dispatch non-blocking error:', err.message);
      return {
        success: false,
        eventId,
      };
    }
  }

  /**
   * Express middleware to verify incoming HMAC signed calls from n8n.
   */
  public static verifyIncomingSignature(req: Request, res: Response, next: NextFunction): void {
    const signature = req.headers['x-zenith-signature'] as string;
    if (!signature) {
      res.status(401).json({ error: 'Missing X-Zenith-Signature header' });
      return;
    }

    const payloadString = JSON.stringify(req.body);
    const expectedSignature = N8nWebhookService.generateSignature(payloadString);

    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      res.status(403).json({ error: 'Invalid HMAC signature' });
      return;
    }

    next();
  }
}
