#!/usr/bin/env node
// Lightweight OAuth2 helper server for local SDK sign-in flows.
// Supports Google and GitHub OAuth for app authentication.
// Usage: set env vars for the providers' client IDs/secrets and run: node scripts/auth-server.js

import http from 'http';
import { URL } from 'url';
import querystring from 'querystring';
import { execFile } from 'child_process';
import { promisify } from 'util';

const PORT = process.env.AUTH_SERVER_PORT || 1236;
const REDIRECT_HOST = process.env.OAUTH_REDIRECT_HOST || `http://127.0.0.1:${PORT}`;
const execFileAsync = promisify(execFile);
const ALLOWED_APP_ORIGINS = new Set((process.env.DEV_DOCTOR_ALLOWED_ORIGINS || 'http://127.0.0.1:3000,http://localhost:3000').split(',').map(value => value.trim()).filter(Boolean));
const KEYCHAIN_SERVICES = {
  openai: process.env.DEV_DOCTOR_OPENAI_KEYCHAIN_SERVICE || 'Dev Doctor AI — OpenAI',
  gemini: process.env.DEV_DOCTOR_GEMINI_KEYCHAIN_SERVICE || 'Dev Doctor AI — Gemini',
};

const PROVIDERS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    scope: 'openid email profile'
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
    scope: 'read:user user:email'
  }
};

let currentToken = null;
let currentProvider = null;

const json = (res, obj, code = 200) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
};

const html = (res, body) => {
  res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
};

const credentialJson = (req, res, obj, code = 200) => {
  const origin = req.headers.origin || '';
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, max-age=0',
    'Pragma': 'no-cache',
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
  });
  res.end(body);
};

const readKeychainCredential = async provider => {
  const service = KEYCHAIN_SERVICES[provider];
  if (!service) return null;
  const { stdout } = await execFileAsync('/usr/bin/security', ['find-generic-password', '-s', service, '-w'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024,
  });
  return stdout.trim();
};

const readJsonBody = req => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', chunk => { body += chunk; if (body.length > 2_000_000) reject(new Error('request_too_large')); });
  req.on('end', () => {
    try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('invalid_json')); }
  });
  req.on('error', reject);
});

const proxyJson = (req, res, payload, code = 200) => {
  const origin = req.headers.origin || '';
  if (!ALLOWED_APP_ORIGINS.has(origin) || !/^(?:127\.0\.0\.1|localhost):1236$/.test(req.headers.host || '')) return credentialJson(req, res, { error: 'forbidden' }, 403);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin' });
    return res.end();
  }
  return credentialJson(req, res, payload, code);
};

const geminiProxy = async (req, res, body) => {
  const apiKey = await readKeychainCredential('gemini');
  if (!apiKey) return proxyJson(req, res, { error: 'credential_not_found' }, 404);
  const model = String(body.model || '').replace(/^models\//, '');
  if (!model || !Array.isArray(body.contents)) return proxyJson(req, res, { error: 'invalid_gemini_request' }, 400);
  // AI Studio API keys use the key query parameter. OAuth-style credentials
  // (for example a ya29 token) must be sent as a bearer header instead. Both
  // cases stay server-side; the browser never receives or transmits the secret.
  const looksLikeApiKey = /^AIza[\w-]+$/i.test(apiKey);
  const upstream = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent${looksLikeApiKey ? `?key=${encodeURIComponent(apiKey)}` : ''}`;
  const upstreamResponse = await fetch(upstream, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(looksLikeApiKey ? {} : { Authorization: `Bearer ${apiKey}` }) },
    body: JSON.stringify({ systemInstruction: body.systemInstruction, contents: body.contents, generationConfig: body.generationConfig }),
  });
  const responseBody = await upstreamResponse.text();
  res.writeHead(upstreamResponse.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': req.headers.origin || '', Vary: 'Origin' });
  return res.end(responseBody);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `${REDIRECT_HOST}`);

  if (url.pathname === '/health') return json(res, { status: 'ok' });

  if (url.pathname === '/credential-status/gemini') {
    try { return proxyJson(req, res, { provider: 'gemini', available: Boolean(await readKeychainCredential('gemini')) }); }
    catch { return proxyJson(req, res, { provider: 'gemini', available: false }); }
  }

  if (url.pathname === '/provider/gemini/generate') {
    if (req.method === 'OPTIONS') return proxyJson(req, res, {});
    if (req.method !== 'POST') return proxyJson(req, res, { error: 'method_not_allowed' }, 405);
    try { return await geminiProxy(req, res, await readJsonBody(req)); }
    catch (error) { return proxyJson(req, res, { error: 'gemini_proxy_error', message: error instanceof Error ? error.message : 'Gemini proxy failed.' }, 502); }
  }

  if (url.pathname.startsWith('/credentials/')) {
    const origin = req.headers.origin || '';
    const host = req.headers.host || '';
    if (!ALLOWED_APP_ORIGINS.has(origin) || !/^(?:127\.0\.0\.1|localhost):1236$/.test(host)) {
      return credentialJson(req, res, { error: 'forbidden' }, 403);
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        'Vary': 'Origin',
      });
      return res.end();
    }
    if (req.method !== 'POST') return credentialJson(req, res, { error: 'method_not_allowed' }, 405);
    const provider = url.pathname.slice('/credentials/'.length);
    if (!Object.hasOwn(KEYCHAIN_SERVICES, provider)) return credentialJson(req, res, { error: 'unsupported_provider' }, 404);
    try {
      const apiKey = await readKeychainCredential(provider);
      if (!apiKey) return credentialJson(req, res, { error: 'credential_not_found' }, 404);
      return credentialJson(req, res, { provider, apiKey });
    } catch {
      return credentialJson(req, res, { error: 'credential_not_found' }, 404);
    }
  }

  if (url.pathname === '/auth/start') {
    const provider = url.searchParams.get('provider') || 'google';
    const p = PROVIDERS[provider];
    if (!p) return json(res, { error: 'unknown_provider' }, 400);

    const clientId = process.env[p.clientIdEnv] || '';
    if (!clientId) {
      const helpHtml = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Dev Doctor Auth Bridge</title>
<style>
body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; max-width: 500px; margin: 0 auto; line-height: 1.5; }
h2 { color: #00a99d; margin-top: 0; }
.card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; }
code { background: #090d16; padding: 2px 6px; border-radius: 4px; color: #38bdf8; font-size: 0.9em; }
input { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #fff; margin-top: 8px; font-size: 14px; }
button { background: #00a99d; color: #fff; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 12px; width: 100%; font-size: 14px; }
button:hover { background: #008f85; }
</style>
</head>
<body>
  <h2>Dev Doctor Auth Bridge</h2>
  <div class="card">
    <p style="margin-top:0;"><strong>Quick Key / Token Link:</strong></p>
    <p style="font-size:13px; color:#94a3b8;">Paste your OpenAI API key or ChatGPT session token below to connect immediately:</p>
    <input type="password" id="tokenInput" placeholder="sk-... or session token" />
    <button onclick="sendToken()">Link Token & Return to App</button>
  </div>
  <div class="card">
    <p style="margin-top:0;"><strong>ChatGPT Browser Session:</strong></p>
    <p style="font-size:13px; color:#94a3b8;">Load the unpacked <code>extension/</code> folder in Chrome and navigate to <a href="https://chatgpt.com" target="_blank" style="color:#00a99d;">chatgpt.com</a> to bridge your session automatically.</p>
  </div>
  <script>
    function sendToken() {
      const val = document.getElementById('tokenInput').value.trim();
      if (!val) return alert('Please enter a key or token.');
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth_token', provider: '${provider}', token: val }, '*');
        document.body.innerHTML = '<div class="card" style="text-align:center;"><p style="color:#4ade80;font-weight:600;font-size:16px;">Token linked successfully!</p><p style="color:#94a3b8;font-size:13px;">Closing window...</p></div>';
        setTimeout(() => window.close(), 1000);
      } else {
        alert('Connected window not found. You can paste the key directly in Dev Doctor.');
      }
    }
  </script>
</body>
</html>`;
      return html(res, helpHtml);
    }
  }

  if (url.pathname === '/auth/callback') {
    const provider = url.searchParams.get('provider') || 'google';
    const p = PROVIDERS[provider];
    if (!p) return html(res, `<p>Unknown provider.</p>`);

    const code = url.searchParams.get('code');
    if (!code) return html(res, `<p>Missing code in callback.</p>`);

    try {
      const clientId = process.env[p.clientIdEnv] || '';
      const clientSecret = process.env[p.clientSecretEnv] || '';
      const redirectUri = `${REDIRECT_HOST}/auth/callback?provider=${provider}`;

      const body = querystring.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri, grant_type: 'authorization_code' });

      const fetchRes = await fetch(p.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }, body });
      const data = await fetchRes.json();
      currentToken = data.access_token || JSON.stringify(data);
      currentProvider = provider;

      const page = `<!doctype html><html><body><script>
        (function(){
          try { window.opener.postMessage({ type: 'oauth_token', provider: ${JSON.stringify(provider)}, token: ${JSON.stringify(currentToken)} }, '*'); }
          catch(e) { console.error(e); }
          document.write('<p>Sign-in complete. You can close this window.</p>');
          setTimeout(() => window.close(), 1200);
        })();
      </script></body></html>`;
      return html(res, page);
    } catch (err) {
      return html(res, `<pre>Token exchange failed: ${String(err)}</pre>`);
    }
  }

  if (url.pathname === '/auth/token') {
    if (!currentToken) return json(res, { token: null }, 404);
    return json(res, { provider: currentProvider, token: currentToken });
  }

  return json(res, { error: 'not_found' }, 404);
});

server.listen(PORT, '127.0.0.1', () => console.log(`Auth server listening at ${REDIRECT_HOST}`));
process.on('SIGINT', () => process.exit(0));
