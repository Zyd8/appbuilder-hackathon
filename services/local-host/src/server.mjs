import http from 'node:http';

const port = Number(process.env.PORT ?? 8787);
const events = new Map();

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 100_000) reject(new Error('body too large')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('invalid json')); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }); res.end(); return; }
  if (req.method === 'GET' && req.url === '/health') { json(res, 200, { ok: true, mode: 'deterministic-local-host', model: null, cloud: false }); return; }
  if (req.method === 'POST' && req.url === '/v1/answer') {
    try {
      const body = await readBody(req);
      const first = Array.isArray(body.sources) ? body.sources[0] : null;
      if (!first?.text) { json(res, 422, { error: 'sources_required' }); return; }
      json(res, 200, {
        answer: `Local host synthesis (deterministic demo): start with ${first.text}`,
        citations: Array.isArray(body.sources) ? body.sources.slice(0, 3).map((source) => source.id) : [],
        model: 'deterministic-local-host',
        cloud: false,
      });
      return;
    } catch (error) { json(res, 400, { error: error instanceof Error ? error.message : 'bad_request' }); return; }
  }
  if (req.method === 'POST' && req.url === '/v1/sync/push') {
    try {
      const body = await readBody(req);
      const incoming = Array.isArray(body.events) ? body.events : [];
      const acknowledged = incoming.map((event) => {
        const existing = events.get(event.id);
        if (existing) return { id: event.id, state: 'duplicate' };
        events.set(event.id, { ...event, acknowledgedAt: new Date().toISOString() });
        return { id: event.id, state: 'acknowledged' };
      });
      json(res, 200, { acknowledged });
      return;
    } catch (error) { json(res, 400, { error: error instanceof Error ? error.message : 'bad_request' }); return; }
  }
  json(res, 404, { error: 'not_found' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`PocketOps local host listening on 0.0.0.0:${port}`);
});
