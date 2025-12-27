// src/functions/product-updated-http.ts
import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { EmailClient } from '@azure/communication-email';

type ProductUpdatedBody = {
  id?: string;
  name?: string;
  description?: string;
  updatedAt?: string;
  // We will add recipientEmail in Option 1
  recipientEmail?: string;
};

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export async function productUpdatedHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const start = Date.now();

  try {
    const ACS_CONNECTION_STRING = getEnv('ACS_CONNECTION_STRING');
    const EMAIL_FROM = getEnv('EMAIL_FROM');

    const body = (await request.json()) as ProductUpdatedBody;

    const recipientEmail = body?.recipientEmail;
    if (!recipientEmail) {
      return {
        status: 400,
        jsonBody: { success: false, error: 'recipientEmail is required' },
      };
    }

    const subject = body?.name ?? 'Reservation update';
    const message = body?.description ?? 'Your reservation has been updated.';
    const updatedAt = body?.updatedAt ?? new Date().toISOString();

    const client = new EmailClient(ACS_CONNECTION_STRING);

    const poller = await client.beginSend({
      senderAddress: EMAIL_FROM,
      content: {
        subject,
        plainText: `${message}\n\nUpdated: ${updatedAt}`,
      },
      recipients: {
        to: [{ address: recipientEmail }],
      },
    });

    const result = await poller.pollUntilDone();

    context.log('[Notify] Email send result', result);

    return {
      status: 200,
      jsonBody: { success: true, result },
    };
  } catch (err: any) {
    context.error('[Notify] productUpdatedHttp failed', err);
    return {
      status: 500,
      jsonBody: { success: false, error: err?.message ?? String(err) },
    };
  } finally {
    context.log('[Notify] productUpdatedHttp durationMs', Date.now() - start);
  }
}

app.http('product-updated-http', {
  route: 'integration/events/product-updated',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: productUpdatedHttp,
});
