/**
 * Compte Boost : enregistrement des données dans cette feuille Google.
 * À coller dans Extensions > Apps Script, puis à déployer en « Application Web »
 * (Exécuter en tant que : moi ; Qui a accès : tout le monde).
 * Les onglets CB_... sont créés automatiquement. Les autres onglets ne sont jamais modifiés.
 */
var ADMIN_KEY = '__ADMIN_KEY__';
var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
var DOCS = ['pages', 'membres', 'validations'];
var COLS_SAISIES = ['id', 'date', 'jour', 'heure', 'page', 'saisi par', 'boosts actifs', 'en pause', 'supprimés',
  'nouveaux msg boosts', 'messages réels', 'écart', 'données'];

function doGet() {
  return out({ ok: true, app: 'CompteBoost' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var req = JSON.parse(e.postData.contents);
    return out({ ok: true, data: handle(req) });
  } catch (err) {
    return out({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function handle(req) {
  var who = identify(req.key);
  if (!who) throw new Error('Lien invalide');
  var a = req.action;
  if (a === 'whoami') return who;
  if (a === 'addEntry') return addEntry(who, req.entry);
  if (who.role === 'employe') {
    if (a === 'me') return mine(who);
    throw new Error('Action réservée à l’administrateur');
  }
  if (a === 'all') return everything();
  if (a === 'set') { checkCol(req.col); writeDocs(req.col, [{ id: req.id, data: req.data }]); return true; }
  if (a === 'update') {
    checkCol(req.col);
    var cur = readDocs(req.col)[req.id];
    if (!cur) throw new Error('Introuvable');
    for (var k in req.data) cur[k] = req.data[k];
    writeDocs(req.col, [{ id: req.id, data: cur }]);
    return true;
  }
  if (a === 'setMany') { checkCol(req.col); writeDocs(req.col, req.docs); return true; }
  if (a === 'addMember') {
    var id = 'm' + Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    var m = { libelle: String(req.nom || 'Employé').slice(0, 80), token: Utilities.getUuid().replace(/-/g, ''), inscritLe: new Date().toISOString() };
    writeDocs('membres', [{ id: id, data: m }]);
    return { id: id, data: m };
  }
  throw new Error('Action inconnue');
}

function identify(key) {
  if (!key) return null;
  if (key === ADMIN_KEY && ADMIN_KEY.indexOf('__') !== 0) return { role: 'admin', id: 'admin', nom: 'Administrateur' };
  var ms = readDocs('membres');
  for (var id in ms) {
    if (ms[id].token && ms[id].token === key && ms[id].actif !== false) return { role: 'employe', id: id, nom: ms[id].libelle || 'Employé' };
  }
  return null;
}

function checkCol(c) {
  if (DOCS.indexOf(c) < 0) throw new Error('Collection inconnue');
}

function sheet(name, header) {
  var ss = SpreadsheetApp.getActive();
  var s = ss.getSheetByName('CB_' + name);
  if (!s) {
    s = ss.insertSheet('CB_' + name);
    s.appendRow(header || ['id', 'données', 'modifié le']);
    s.setFrozenRows(1);
  }
  return s;
}

function readDocs(name) {
  var v = sheet(name).getDataRange().getValues(), o = {};
  for (var i = 1; i < v.length; i++) if (v[i][0]) o[v[i][0]] = JSON.parse(v[i][1]);
  return o;
}

function writeDocs(name, docs) {
  var s = sheet(name), last = s.getLastRow();
  var ids = last > 1 ? s.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  var now = new Date(), add = [];
  docs.forEach(function (d) {
    var row = [String(d.id), JSON.stringify(d.data), now], i = ids.indexOf(String(d.id));
    if (i >= 0) s.getRange(i + 2, 1, 1, 3).setValues([row]);
    else { add.push(row); ids.push(String(d.id)); }
  });
  if (add.length) s.getRange(s.getLastRow() + 1, 1, add.length, 3).setValues(add);
}

function readEntries() {
  var v = sheet('saisies', COLS_SAISIES).getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    var e = JSON.parse(v[i][12]);
    e.id = String(v[i][0]);
    out.push(e);
  }
  return out;
}

function everything() {
  return { pages: readDocs('pages'), membres: readDocs('membres'), validations: readDocs('validations'), saisies: readEntries() };
}

function mine(who) {
  var pages = readDocs('pages'), mes = {};
  for (var id in pages) if (pages[id].responsable === who.id && !pages[id].archivee) mes[id] = pages[id];
  var saisies = readEntries().filter(function (e) { return e.auteur === who.id; }).slice(-300);
  return { moi: who, pages: mes, saisies: saisies };
}

/* La date et l'heure viennent de l'horloge de Google, jamais de l'appareil de l'employé. */
function addEntry(who, e) {
  var pages = readDocs('pages'), p = pages[e.pageId];
  if (!p) throw new Error('Page inconnue');
  if (who.role !== 'admin' && p.responsable !== who.id) throw new Error('Cette page ne t’est pas attribuée');
  var tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  var now = new Date();
  e.id = 's' + now.getTime() + Math.floor(Math.random() * 1000);
  e.auteur = who.id;
  e.horodatage = now.toISOString();
  e.date = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  e.jour = JOURS[Number(Utilities.formatDate(now, tz, 'u')) % 7];
  e.heure = Utilities.formatDate(now, tz, 'HH:mm');
  var t = e.totaux || {};
  sheet('saisies', COLS_SAISIES).appendRow([e.id, e.date, e.jour, e.heure, p.nom, who.nom, t.actifs, t.pause, t.supprimes,
    t.messagesBoosts, t.reels, t.ecart, JSON.stringify(e)]);
  return e;
}
