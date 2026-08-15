#!/usr/bin/env node
// Lightweight OAuth2 helper server for local SDK sign-in flows.
// Supports Google and GitHub OAuth for app authentication.
// Usage: set env vars for the providers' client IDs/secrets and run: node scripts/auth-server.js

import http from 'http';
import { URL } from 'url';
import querystring from 'querystring';

const PORT = process.env.AUTH_SERVER_PORT || 1236;
const REDIRECT_HOST = process.env.OAUTH_REDIRECT_HOST || `http://127.0.0.1:${PORT}`;

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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `${REDIRECT_HOST}`);

  if (url.pathname === '/health') return json(res, { status: 'ok' });

  if (url.pathname === '/auth/start') {
    const provider = url.searchParams.get('provider') || 'google';
    const p = PROVIDERS[provider];
    if (!p) return json(res, { error: 'unknown_provider' }, 400);

    const clientId = process.env[p.clientIdEnv] || '';
    const redirectUri = `${REDIRECT_HOST}/auth/callback?provider=${provider}`;
    const state = Math.random().toString(36).slice(2);

    const qs = querystring.stringify({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: p.scope, state, allow_signup: true });
    const location = `${p.authUrl}?${qs}`;
    res.writeHead(302, { Location: location });
    return res.end();
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
