#!/usr/bin/env node

import http from 'http';
import https from 'https';
import { URL } from 'url';

const UPSTREAM = process.env.LM_UPSTREAM || 'http://127.0.0.1:1234';
const PORT = process.env.PORT || 1235;

function proxyRequest(req, res) {
  const targetUrl = new URL(req.url, UPSTREAM);
  const isHttps = targetUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const headers = {
    ...(req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {}),
    ...(req.headers['content-length'] ? { 'content-length': req.headers['content-length'] } : {}),
    ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
    ...(req.headers.accept ? { accept: req.headers.accept } : {}),
  };

  const upstreamReq = client.request(
    targetUrl,
    {
      method: req.method,
      headers,
    },
    upstreamRes => {
      console.log(`[lm-proxy] ${req.method} ${req.url} -> ${upstreamRes.statusCode} (${req.headers['content-length'] || 0} request bytes)`);
      const responseHeaders = { ...upstreamRes.headers };
      responseHeaders['access-control-allow-origin'] = origin;
      responseHeaders['access-control-allow-methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
      responseHeaders['access-control-allow-headers'] = 'Content-Type, Authorization';
      res.writeHead(upstreamRes.statusCode || 200, responseHeaders);
      upstreamRes.pipe(res);
    }
  );

  upstreamReq.on('error', err => {
    console.error('[lm-proxy] upstream request error', err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Gateway', message: String(err) }));
  });

  req.pipe(upstreamReq);
}

const server = http.createServer(proxyRequest);
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[lm-proxy] Listening on http://127.0.0.1:${PORT}, forwarding to ${UPSTREAM}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);