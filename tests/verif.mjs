// Vérification du site en ligne, sans créer de compte ni modifier de données
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8080/';
const cfgTxt = await (await fetch(new URL('config.js', SITE))).text();
const url = /url:"([^"]+)"/.exec(cfgTxt)[1], key = /key:"([^"]+)"/.exec(cfgTxt)[1];
const h = { apikey: key };
const s = await (await fetch(url + '/auth/v1/settings', { headers: h })).json();
console.log('AUTH email activé:', s.external && s.external.email, '| confirmation e-mail désactivée:', s.mailer_autoconfirm, '| inscriptions:', !s.disable_signup);
const t = await fetch(url + '/rest/v1/rpc/heure_serveur', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: '{}' });
console.log('RPC heure_serveur (anonyme):', t.status, (await t.text()).slice(0, 120));
const d = await fetch(url + '/rest/v1/docs?select=path&limit=1', { headers: h });
console.log('Table docs (anonyme, doit être refusée ou vide):', d.status, (await d.text()).slice(0, 120));
const b = await chromium.launch();
for (const [name, vp] of [['ordinateur', { width: 1280, height: 800 }], ['téléphone', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITE + '?id=anja6585'); await p.waitForSelector('#cbLogin', { timeout: 20000 });
  console.log(name, '| écran de connexion OK | identifiant pré-rempli:', await p.inputValue('#cbId'));
  if (/^https:/.test(SITE)) { const q = await b.newPage({ viewport: vp }); await q.goto(SITE + 'ANJA6585'); await q.waitForSelector('#cbLogin', { timeout: 20000 }); console.log(name, '| lien sans ?id= →', q.url(), '| identifiant:', await q.inputValue('#cbId')); await q.close(); }
  await p.fill('#cbPw', 'mauvais-mot-de-passe'); await p.click('.cb-btn'); await p.waitForTimeout(4000);
  console.log(name, '| mauvais mot de passe →', await p.textContent('.cb-msg'));
  const w = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(name, '| largeur page', w, '| erreurs JS', JSON.stringify(errs));
  await p.screenshot({ path: 'verif-' + vp.width + '.png' });
}
await b.close();
