/**
 * Headers on every response past the sign-in module. Another site may not frame these pages,
 * which would let it trick the signed-in person into clicking (`frame-ancestors`,
 * `X-Frame-Options`), responses are taken for the type they declare, and no referrer leaves.
 * The policy restricts framing, the base URL and form targets only, not scripts.
 */
import { defineMiddleware } from '@fluixi/start';

const HEADERS: Record<string, string> = {
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export default defineMiddleware(async (_request, next) => {
  const answer = await next();
  // A copy: a response passed through from fetch has headers that cannot be changed.
  const response = new Response(answer.body, answer);
  for (const [name, value] of Object.entries(HEADERS)) {
    if (!response.headers.has(name)) response.headers.set(name, value);
  }
  return response;
});
