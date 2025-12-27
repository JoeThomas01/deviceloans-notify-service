// src/functions/product-updated-http.ts
import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { EmailClient } from '@azure/communication-email';

type Body = {
  id: string;
  name: string;
  pricePence: number;
  description?: string;
  updatedAt: string; // ISO
  recipientEmail: string;
};

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function isNonNegativeInt(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x) && x >= 0;
}

function isIsoDateString(x: unknown): x is string {
  if (typeof x !== 'string') return false;
  const d = new Date(x);
  return !Number.isNaN(d.getTime()) && x.includes('T');
}

function asString(x: unknown): string {
  return typeof x === 'string' ? x : String(x ?? '');
}

export async function productUpdatedHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const start = Date.now();
  context.log('[Notify] productUpdatedHttp start', {
    invocationId: context.invocationId,
    method: request.method,
    url: request.url,
  });

  try {
    // ✅ Required env vars (already set in your Function App)
    const acsConn = mustGetEnv('ACS_CONNECTION_STRING');
    const emailFrom = mustGetEnv('EMAIL_FROM');

    // Parse body
    let bodyUnknown: unknown;
    try {
      bodyUnknown = await request.json();
    } catch {
      return {
        status: 400,
        jsonBody: {
          error: 'ValidationError',
          details: ['Body must be valid JSON'],
        },
      };
    }

    const b = (bodyUnknown ?? {}) as Record<string, unknown>;

    const payload: Body = {
      id: asString(b.id),
      name: asString(b.name),
      pricePence:
        typeof b.pricePence === 'number' ? b.pricePence : Number(b.pricePence),
      description:
        typeof b.description === 'string' ? b.description : undefined,
      updatedAt: asString(b.updatedAt),
      recipientEmail: asString(b.recipientEmail),
    };

    const errors: string[] = [];

    if (!payload.id.trim()) errors.push('id is required');
    if (!payload.name.trim()) errors.push('name is required');
    if (!isNonNegativeInt(payload.pricePence))
      errors.push('pricePence must be a non-negative integer');
    if (!payload.recipientEmail.includes('@'))
      errors.push('recipientEmail must be a valid email');
    if (!isIsoDateString(payload.updatedAt))
      errors.push('updatedAt must be an ISO 8601 string (Date.toISOString)');

    if (errors.length) {
      context.warn('[Notify] productUpdatedHttp validation failed', {
        invocationId: context.invocationId,
        errors,
      });
      return {
        status: 400,
        jsonBody: { error: 'ValidationError', details: errors },
      };
    }

    // Send email via ACS Email
    const client = new EmailClient(acsConn);

    const subject = `Update: ${payload.name}`;
    const text = [
      `Update received:`,
      ``,
      `ID: ${payload.id}`,
      `Name: ${payload.name}`,
      `Description: ${payload.description ?? '-'}`,
      `Updated At: ${payload.updatedAt}`,
      ``,
      `— DeviceLoans Notify Service`,
    ].join('\n');

    const html = `
      <h2>Device update received</h2>
      <p><strong>ID:</strong> ${payload.id}</p>
      <p><strong>Name:</strong> ${payload.name}</p>
      <p><strong>Description:</strong> ${payload.description ?? '-'}</p>
      <p><strong>Updated At:</strong> ${payload.updatedAt}</p>
      <hr/>
      <p style="color:#666">DeviceLoans Notify Service</p>
    `;

    context.log('[Notify] sending email', {
      invocationId: context.invocationId,
      to: payload.recipientEmail,
      from: emailFrom,
    });

    const message = {
      senderAddress: emailFrom,
      recipients: { to: [{ address: payload.recipientEmail }] },
      content: { subject, plainText: text, html },
    };

    // The SDK uses a poller
    const poller = await client.beginSend(message);
    const result = await poller.pollUntilDone();

    context.log('[Notify] email send result', {
      invocationId: context.invocationId,
      durationMs: Date.now() - start,
      messageId: (result as any)?.id ?? null,
      status: (result as any)?.status ?? null,
    });

    // Keep returning 202 to match “accepted” behaviour
    return { status: 202, jsonBody: { message: 'accepted' } };
  } catch (err: any) {
    context.error('[Notify] productUpdatedHttp error', {
      invocationId: context.invocationId,
      message: err?.message ?? 'Unknown error',
      err,
    });

    return {
      status: 500,
      jsonBody: {
        error: 'InternalServerError',
        message: err?.message ?? 'Unknown error',
      },
    };
  }
}

app.http('product-updated-http', {
  route: 'integration/events/product-updated',
  methods: ['POST'],
  authLevel: 'function',
  handler: productUpdatedHttp,
});
