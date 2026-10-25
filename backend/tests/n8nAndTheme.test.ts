import { describe, it } from 'node:test';
import assert from 'node:assert';
import { N8nWebhookService } from '../src/services/n8nWebhookService.js';

describe('🤖 CHUNK 12 & 16: Theme Engine & n8n Automation Workflows', () => {
  it('should compute valid HMAC SHA-256 signatures for outgoing events', () => {
    const payload = JSON.stringify({ event: 'test', data: 123 });
    const sig1 = N8nWebhookService.generateSignature(payload);
    const sig2 = N8nWebhookService.generateSignature(payload);

    assert.ok(sig1, 'Signature must be generated');
    assert.strictEqual(sig1, sig2, 'HMAC must be deterministic for identical payloads');
    assert.strictEqual(sig1.length, 64, 'SHA-256 hex digest should be 64 characters');
  });

  it('should produce distinct signatures for altered payloads (tamper-proofing)', () => {
    const original = JSON.stringify({ amount: 100 });
    const tampered = JSON.stringify({ amount: 999 });

    const sigOriginal = N8nWebhookService.generateSignature(original);
    const sigTampered = N8nWebhookService.generateSignature(tampered);

    assert.notStrictEqual(sigOriginal, sigTampered, 'Tampered payloads must have distinct signatures');
  });

  it('should generate non-blocking dispatch result with idempotency key', async () => {
    // Dispatch to a non-existent port (should gracefully handle without throwing)
    const result = await N8nWebhookService.dispatchEvent(
      'http://127.0.0.1:59999/webhook',
      'focus_session.completed',
      { userId: 'u123', score: 95 }
    );

    assert.ok(result.eventId, 'Event ID must be generated');
    assert.strictEqual(result.success, false, 'Connection failure should return success: false without crashing');
  });
});
