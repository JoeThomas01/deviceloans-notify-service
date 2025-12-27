// src/functions/health-http.ts
import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';

export async function healthHttp(
  _req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('[Notify] health ok');
  return { status: 200, jsonBody: { ok: true } };
}

app.http('health-http', {
  route: 'health',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: healthHttp,
});
