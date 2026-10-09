// Diagnostic de l'inscription (crée un compte de test diag-…@compteboost.app, sans droits)
import fs from 'fs';
const t = fs.readFileSync('config.js', 'utf8');
const url = t.match(/url:"([^"]+)"/)[1], key = t.match(/key:"([^"]+)"/)[1];
const origin = 'https://randnjara.github.io';
const pre = await fetch(url + '/auth/v1/signup', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'apikey,authorization,content-type,x-client-info,x-supabase-api-version' } });
console.log('préflight', pre.status, 'allow-origin:', pre.headers.get('access-control-allow-origin'), 'allow-headers:', pre.headers.get('access-control-allow-headers'));
const email = 'diag-' + Date.now() + '@compteboost.app';
const t0 = Date.now();
const r = await fetch(url + '/auth/v1/signup', { method: 'POST', headers: { Origin: origin, apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'diag-' + Math.random().toString(36).slice(2) }) });
const body = await r.text();
console.log('signup', r.status, (Date.now() - t0) + 'ms', 'allow-origin:', r.headers.get('access-control-allow-origin'));
console.log('réponse', body.replace(/"(access_token|refresh_token)":"[^"]+"/g, '"$1":"…"').slice(0, 600));
