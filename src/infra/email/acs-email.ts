// src/infra/email/acs-email.ts
import { EmailClient } from '@azure/communication-email';

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

let client: EmailClient | null = null;

function getClient(): EmailClient {
  if (client) return client;
  const conn = mustGetEnv('ACS_CONNECTION_STRING');
  client = new EmailClient(conn);
  return client;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const from = mustGetEnv('EMAIL_FROM');

  const emailClient = getClient();

  const poller = await emailClient.beginSend({
    senderAddress: from,
    content: {
      subject: params.subject,
      plainText: params.text,
    },
    recipients: {
      to: [{ address: params.to }],
    },
  });

  await poller.pollUntilDone();
}
