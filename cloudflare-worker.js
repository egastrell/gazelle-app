// Worker: gazelle-asesor
// URL esperada tras el deploy: https://gazelle-asesor.efgastrell.workers.dev
//
// Setup en Cloudflare (dashboard, ~10 min):
// 1. Workers & Pages → Create → Create Worker → nombre "gazelle-asesor" → Deploy.
// 2. Edit code → pegar este archivo completo → Deploy.
// 3. Settings → Variables and Secrets → Add → tipo "Secret" → nombre
//    ANTHROPIC_API_KEY → pegar la API key de Anthropic → Save and Deploy.
// 4. Confirmar que la URL pública sea https://gazelle-asesor.efgastrell.workers.dev
//    (si el subdominio de Workers es distinto, actualizar la URL en index.html).

const ALLOWED_ORIGIN = 'https://egastrell.github.io';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await request.text();

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body,
    });

    const respBody = await anthropicRes.text();

    return new Response(respBody, {
      status: anthropicRes.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      },
    });
  },
};
