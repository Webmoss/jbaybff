import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const PAYSTACK_BASE = 'https://api.paystack.co';

type InitializePayload = {
  email: string;
  /** ZAR amount in cents (subunit). */
  amountCents: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
};

@Injectable()
export class PaystackClientService {
  constructor(private readonly cfg: ConfigService) {}

  private secret(): string {
    const s = this.cfg.get<string>('PAYSTACK_SECRET_KEY');
    if (!s) {
      throw new ServiceUnavailableException(
        'PAYSTACK_SECRET_KEY is not configured — add it to apps/api/.env for live or test keys.',
      );
    }
    return s;
  }

  async initializeTransaction(payload: InitializePayload): Promise<{
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  }> {
    const body = {
      email: payload.email,
      amount: String(payload.amountCents),
      currency: 'ZAR',
      reference: payload.reference,
      callback_url: payload.callbackUrl,
      metadata: payload.metadata,
      channels: ['card'],
    };

    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secret()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; access_code?: string; reference?: string };
    };

    if (!res.ok || !json.status || !json.data?.authorization_url) {
      throw new ServiceUnavailableException(json.message ?? `Paystack initialize failed (${res.status})`);
    }

    return {
      authorizationUrl: json.data.authorization_url,
      accessCode: json.data.access_code ?? '',
      reference: json.data.reference ?? payload.reference,
    };
  }

  /** Confirms transaction state with Paystack (use after redirect or from webhook guard-rail). */
  async verifyTransaction(reference: string): Promise<{
    ok: boolean;
    amountCents: number;
    currency: string;
    status: string;
    id?: string;
  }> {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${this.secret()}` },
    });

    const json = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { status?: string; amount?: number; currency?: string; id?: number };
    };

    if (!res.ok || !json.status || !json.data) {
      return { ok: false, amountCents: 0, currency: 'ZAR', status: 'unknown' };
    }

    const d = json.data;
    return {
      ok: d.status === 'success',
      amountCents: Number(d.amount ?? 0),
      currency: d.currency ?? 'ZAR',
      status: d.status ?? 'unknown',
      id: d.id !== undefined ? String(d.id) : undefined,
    };
  }
}
