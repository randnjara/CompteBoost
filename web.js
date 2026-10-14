/* Compte Boost en ligne : connexion (identifiant + mot de passe) et base Supabase.
   Fournit à l'application la même interface que claude.ai (db, user, downloads). */
(function(){
"use strict";
var CFG=window.CB_CONFIG||{}, DOMAINE='@compteboost.app';
if(!CFG.url||!CFG.key||!window.supabase){document.addEventListener('DOMContentLoaded',function(){var d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;background:#eef6fc;font:16px system-ui;text-align:center;color:#0b4f86';d.textContent='Compte Boost : le site n\u2019est pas encore relié à sa base de données.';document.body.appendChild(d)});window.claude={use:function(){return new Promise(function(){})}};return}
var sb=window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,autoRefreshToken:true}});
var session=null, profil=null, ready=null, resolveReady;
ready=new Promise(function(r){resolveReady=r});

function emailOf(id){id=String(id||'').trim();return id.indexOf('@')>0?id.toLowerCase():id.toLowerCase().replace(/[^a-z0-9]/g,'')+DOMAINE}
function err(e){var x=new Error(e&&e.message||'Erreur');x.code=e&&e.code;return x}
function q(p){return p.then(function(r){if(r.error)throw err(r.error);return r.data})}
function parentOf(path){var i=path.lastIndexOf('/');return i<0?'':path.slice(0,i)}
function idOf(path){return path.slice(path.lastIndexOf('/')+1)}
function rid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,10)}

/* ---------- Données : un document = une ligne (path, data) ---------- */
var subs={}, cache={};
function snapOf(parent){var m=cache[parent]||{};var docs=Object.keys(m).sort().map(function(p){var d=m[p];return {id:idOf(p),exists:true,data:function(){return d}}});return {docs:docs,size:docs.length,empty:!docs.length}}
function notify(parent){(subs[parent]||[]).forEach(function(cb){try{cb(snapOf(parent))}catch(e){console.error(e)}})}
/* ---------- Hors ligne : copie locale des données (IndexedDB) et file d'envoi (localStorage) ----------
   Sans Internet, l'application lit la dernière copie et garde chaque écriture sur l'appareil ;
   dès que la connexion revient, tout est envoyé automatiquement, dans l'ordre. */
var OFF=false, UID=null, outbox=[], conflits=[], flushing=false;
var idb=null;
function idbOpen(){if(idb)return idb;idb=new Promise(function(ok,no){try{var r=indexedDB.open('compte-boost',1);r.onupgradeneeded=function(){r.result.createObjectStore('kv')};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}}catch(e){no(e)}});return idb}
function idbGet(k){return idbOpen().then(function(d){return new Promise(function(ok){var r=d.transaction('kv').objectStore('kv').get(k);r.onsuccess=function(){ok(r.result)};r.onerror=function(){ok(undefined)}})}).catch(function(){return undefined})}
function idbSet(k,v){return idbOpen().then(function(d){return new Promise(function(ok){var t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=function(){ok(true)};t.onerror=function(){ok(false)}})}).catch(function(){return false})}
function lsGet(k,def){try{var v=localStorage.getItem(k);return v?JSON.parse(v):def}catch(e){return def}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function boxKey(){return 'cb-outbox-'+UID}
function saveBox(){lsSet(boxKey(),outbox);lsSet('cb-conflits-'+UID,conflits);badge()}
function applyOp(o){
  var p=parentOf(o.path);if(!cache[p])return;
  if(o.op==='set')cache[p][o.path]=o.data;
  else if(o.op==='update')cache[p][o.path]=Object.assign({},cache[p][o.path]||{},o.patch);
  else if(o.op==='delete')delete cache[p][o.path];
}
function withPending(parent){outbox.forEach(function(o){if(parentOf(o.path)===parent)applyOp(o)})}
function setOff(v){if(OFF!==v){OFF=v;badge()}}
function loadAll(parent){
  var out={}, step=500;
  function page(from){return q(sb.from('docs').select('path,data').eq('parent',parent).order('path').range(from,from+step-1)).then(function(rows){rows.forEach(function(r){out[r.path]=r.data});return rows.length===step?page(from+step):out})}
  if(OFF&&!navigator.onLine)return fromLocal(parent);
  return page(0).then(function(m){setOff(false);cache[parent]=m;if(UID)idbSet(UID+'|'+parent,m);withPending(parent);notify(parent);return m},
    function(e){if(!net(e))throw e;setOff(true);return fromLocal(parent)});
}
function fromLocal(parent){
  return idbGet(UID+'|'+parent).then(function(m){
    if(!m&&!cache[parent])throw new Error('Pas encore de copie sur cet appareil : connecte-toi une première fois avec Internet.');
    if(m)cache[parent]=m;withPending(parent);notify(parent);return cache[parent];
  });
}
function local(path,data){var p=parentOf(path);if(!cache[p])return;if(data==null)delete cache[p][path];else cache[p][path]=data;notify(p)}
/* Écriture : en ligne directement ; sans connexion, mise en file et affichée tout de suite */
function enFile(o){
  o.t=Date.now();
  /* L'heure officielle reste celle du serveur à l'envoi ; on garde aussi l'heure de l'appareil, pour information */
  if(o.op==='set'&&/^jours\//.test(o.path)&&o.data)o.data=Object.assign({},o.data,{horsLigne:true,saisiSurAppareilLe:new Date().toISOString()});outbox.push(o);saveBox();
  var p=parentOf(o.path);if(cache[p]){applyOp(o);notify(p);if(UID)idbSet(UID+'|'+p,stripPending(p))}
  if(navigator.onLine)setTimeout(flush,800);
  return Promise.resolve();
}
function stripPending(p){return cache[p]}
function ecrire(o,direct){
  if(OFF&&!navigator.onLine||outbox.length)return enFile(o);
  return direct().then(function(r){setOff(false);return r},function(e){if(!net(e))throw e;setOff(true);return enFile(o)});
}
function envoyer(o){
  if(o.op==='update')return q(sb.rpc('fusion',{p:o.path,patch:o.patch}));
  if(o.op==='delete')return q(sb.from('docs').delete().eq('path',o.path));
  if(!o.creer)return q(sb.from('docs').upsert({path:o.path,parent:parentOf(o.path),data:o.data}));
  /* Nouveau document créé hors ligne : jamais écraser ce que quelqu'un d'autre a enregistré entre-temps */
  return sb.from('docs').insert({path:o.path,parent:parentOf(o.path),data:o.data}).then(function(r){
    if(!r.error)return;
    if(r.error.code==='23505'||/duplicate/i.test(r.error.message||'')){conflits.push({path:o.path,data:o.data,le:new Date().toISOString()});return}
    throw err(r.error);
  });
}
function flush(){
  if(flushing||!outbox.length||!UID)return Promise.resolve();
  flushing=true;badge();
  function next(){
    if(!outbox.length)return Promise.resolve(true);
    var o=outbox[0];
    return envoyer(o).then(function(){outbox.shift();saveBox();return next()},function(e){
      if(net(e)||/jwt|token|401/i.test(String(e&&e.message||''))){setOff(true);if(!net(e))sb.auth.refreshSession().catch(function(){});return false}
      conflits.push({path:o.path,data:o.data||o.patch,erreur:String(e&&e.message||e),le:new Date().toISOString()});outbox.shift();saveBox();return next();
    });
  }
  return next().then(function(done){flushing=false;if(done){setOff(false);envoye=Date.now();refresh()}badge()},function(){flushing=false;badge()});
}
var envoye=0, pill=null;
function badge(){
  if(!document.body)return;
  if(!pill){pill=document.createElement('div');pill.className='cb-net';pill.setAttribute('role','status');document.body.appendChild(pill)}
  var n=outbox.length, t='', c='';
  if(conflits.length){t='⚠ '+conflits.length+' saisie'+(conflits.length>1?'s':'')+' non envoyée'+(conflits.length>1?'s':'')+' (déjà enregistrée par quelqu\u2019un d\u2019autre). Elle reste gardée sur cet appareil.';c='ko'}
  else if(OFF||!navigator.onLine){t='Hors ligne'+(n?' · '+n+' enregistrement'+(n>1?'s':'')+' gardé'+(n>1?'s':'')+' sur cet appareil, envoi automatique au retour d\u2019Internet':' · tu peux continuer la saisie');c='off'}
  else if(n){t='Envoi en cours… '+n+' enregistrement'+(n>1?'s':'');c='off'}
  else if(Date.now()-envoye<6000){t='✓ Tout est envoyé';c='ok';setTimeout(badge,6200)}
  pill.textContent=t;pill.className='cb-net '+c;pill.style.display=t?'':'none';
}
window.addEventListener('online',function(){flush();refresh()});
window.addEventListener('offline',function(){setOff(true)});
setInterval(function(){if(outbox.length)flush()},20000);
var channel=null;
function live(){
  if(channel)return;
  channel=sb.channel('docs').on('postgres_changes',{event:'*',schema:'public',table:'docs'},function(ch){
    var row=ch.new&&ch.new.path?ch.new:null, old=ch.old||{};
    if(ch.eventType==='DELETE'){if(old.path)local(old.path,null)}else if(row)local(row.path,row.data);
  }).subscribe();
  setInterval(refresh,60000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh()});
}
function refresh(){if(OFF&&!navigator.onLine)return;Object.keys(subs).forEach(function(p){loadAll(p).catch(function(){})})}

function docRef(path){
  return {id:idOf(path),path:path,
    get:function(){
      function snap(r){return {id:idOf(path),exists:!!r,data:function(){return r||undefined}}}
      function loc(){
        var c=cache[parentOf(path)];
        if(c&&path in c)return Promise.resolve(snap(c[path]));
        return idbGet(UID+'#'+path).then(function(r){var x=r||null;outbox.forEach(function(o){if(o.path!==path)return;if(o.op==='set')x=o.data;else if(o.op==='update')x=Object.assign({},x||{},o.patch);else x=null});return snap(x)});
      }
      if(OFF&&!navigator.onLine||outbox.some(function(o){return o.path===path}))return loc();
      return q(sb.from('docs').select('data').eq('path',path).maybeSingle()).then(function(r){if(UID)idbSet(UID+'#'+path,r?r.data:null);return snap(r?r.data:null)},function(e){if(!net(e))throw e;setOff(true);return loc()})},
    set:function(data){var c=cache[parentOf(path)];return ecrire({op:'set',path:path,data:data,creer:!(c&&path in c)},function(){return q(sb.from('docs').upsert({path:path,parent:parentOf(path),data:data}).select('data').single()).then(function(r){local(path,r.data)})})},
    update:function(patch){return ecrire({op:'update',path:path,patch:patch},function(){return q(sb.rpc('fusion',{p:path,patch:patch})).then(function(){return docRef(path).get()}).then(function(s){if(s.exists)local(path,s.data())})})},
    delete:function(){return ecrire({op:'delete',path:path},function(){return q(sb.from('docs').delete().eq('path',path)).then(function(){local(path,null)})})},
    onSnapshot:function(cb,fail){var p=parentOf(path);return colRef(p).onSnapshot(function(s){var d=s.docs.filter(function(x){return x.id===idOf(path)})[0];cb(d||{id:idOf(path),exists:false,data:function(){}})},fail)}
  };
}
function colRef(parent){
  return {path:parent,
    doc:function(id){return docRef(parent+'/'+(id||rid()))},
    add:function(data){var r=docRef(parent+'/'+rid());return r.set(data).then(function(){return r})},
    get:function(){return loadAll(parent).then(function(){return snapOf(parent)})},
    onSnapshot:function(cb,fail){
      (subs[parent]=subs[parent]||[]).push(cb); live();
      if(cache[parent])cb(snapOf(parent)); else loadAll(parent).catch(function(e){if(fail)fail(e)});
      return function(){subs[parent]=(subs[parent]||[]).filter(function(f){return f!==cb})};
    }
  };
}
var db={doc:docRef,collection:colRef};

/* ---------- Utilisateur ---------- */
var user={
  isOwner:function(){return Promise.resolve(!!profil&&profil.role==='admin')},
  canEdit:function(){return Promise.resolve(!!profil&&profil.role==='admin')},
  id:function(){return Promise.resolve(session?session.user.id:null)},
  name:function(){return Promise.resolve(profil&&profil.nom||'')},
  profiles:function(ids){return Promise.resolve({})}
};
var downloads={save:function(o){var blob=o.data instanceof Blob?o.data:new Blob([o.data],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=o.filename||'export.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);return Promise.resolve(true)}};

window.claude={use:function(name){return ready.then(function(){return name==='db'?db:name==='user'?user:name==='downloads'?downloads:null})}};

/* ---------- Comptes employés (créés par l'administrateur) ---------- */
var sb2=null;
function creerCompte(code,pw){
  code=String(code).toUpperCase();
  sb2=sb2||window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:false,autoRefreshToken:false,storageKey:'cb-creation'}});
  return q(sb.rpc('fusion',{p:'membres/inv_'+code,patch:{ouvert:true}}))
    .then(function(){return sb2.auth.signUp({email:emailOf(code),password:pw})})
    .then(function(r){
      if(r.error){if(/registered|exists/i.test(r.error.message))throw new Error('Un accès existe déjà pour '+code+'. Utilise « Nouveau mot de passe ».');throw err(r.error)}
      return sb2.auth.signOut().catch(function(){});
    })
    .then(function(){return docRef('membres/inv_'+code).get()})
    .then(function(s){if(!s.exists||!s.data().compte)throw new Error('Accès non créé. Vérifie dans Supabase que « Confirm email » est désactivé.')});
}
function changerMdp(code,pw){return q(sb.rpc('changer_mot_de_passe',{code_employe:code,mot_de_passe:pw})).then(function(ok){if(!ok)throw new Error('Aucun accès trouvé pour '+code+'.')})}
function importer(docs,onProgress){
  var rows=docs.filter(function(d){return d&&typeof d.path==='string'&&d.data&&typeof d.data==='object'}).map(function(d){return {path:d.path,parent:parentOf(d.path),data:d.data}}), i=0, n=0;
  function next(){
    if(i>=rows.length){refresh();return Promise.resolve(n)}
    var part=rows.slice(i,i+10); i+=10;
    return q(sb.from('docs').upsert(part,{onConflict:'path',ignoreDuplicates:true})).then(function(){n+=part.length;if(onProgress)onProgress(n,rows.length);return next()});
  }
  return next();
}
function deconnexion(){if(outbox.length&&!window.confirm(outbox.length+' enregistrement(s) ne sont pas encore envoyés. Si tu te déconnectes maintenant, ils restent sur cet appareil et partiront à la prochaine connexion de ce compte. Continuer ?'))return;sb.auth.signOut().then(function(){location.reload()},function(){location.reload()})}
window.CB_WEB={importer:importer,creerCompte:creerCompte,changerMdp:changerMdp,deconnexion:deconnexion,sb:sb};

/* ---------- Écran de connexion ---------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
var box=null;
function loginHtml(mode,msg){
  var adm=mode==='admin';
  return '<div class="cb-login"><form id="cbLogin" class="cb-card">'+
    '<div class="cb-logo">f</div><h1>Compte Boost</h1><p class="cb-sub">'+(adm?'Première installation : crée le compte administrateur.':'Connecte-toi pour continuer.')+'</p>'+
    '<label><span>'+(adm?'Ton adresse e-mail':'Identifiant')+'</span><input id="cbId" autocomplete="username" required placeholder="'+(adm?'ex. moi@gmail.com':'ex. ANJA6585 ou ton e-mail')+'"></label>'+
    '<label><span>Mot de passe</span><input id="cbPw" type="password" autocomplete="'+(adm?'new-password':'current-password')+'" required minlength="6"></label>'+
    '<div class="cb-msg" role="status">'+esc(msg||'')+'</div>'+
    '<button type="submit" class="cb-btn">'+(adm?'Créer le compte administrateur':'Se connecter')+'</button>'+
    '<a href="#" id="cbSwitch" class="cb-link">'+(adm?'← Retour à la connexion':'Première installation (administrateur)')+'</a>'+
    '</form></div>';
}
function showLogin(mode,msg){
  if(!box){box=document.createElement('div');document.body.appendChild(box)}
  box.innerHTML=loginHtml(mode,msg); box.dataset.mode=mode||'login';
  var f=document.getElementById('cbLogin');
  f.onsubmit=function(ev){ev.preventDefault();submit(box.dataset.mode)};
  document.getElementById('cbSwitch').onclick=function(ev){ev.preventDefault();showLogin(box.dataset.mode==='admin'?'login':'admin')};
  var pre=null;try{pre=new URLSearchParams(location.search).get('id')}catch(e){}
  if(pre&&mode!=='admin'){document.getElementById('cbId').value=pre.toUpperCase();setTimeout(function(){var p=document.getElementById('cbPw');if(p)p.focus()},30)}
  else setTimeout(function(){var i=document.getElementById('cbId');if(i)i.focus()},30);
}
function setMsg(t){var m=box&&box.querySelector('.cb-msg');if(m)m.textContent=t}
function net(e){return /fetch|network|load failed|retryable|timed? ?out/i.test(String(e&&(e.message||e.name)||''))}
function retry(fn,n){return fn().catch(function(e){if(n>0&&net(e))return new Promise(function(r){setTimeout(r,1500)}).then(function(){return retry(fn,n-1)});throw e})}
function signIn(id,pw){return sb.auth.signInWithPassword({email:emailOf(id),password:pw}).then(function(r){if(r.error)throw r.error;return r})}
function nice(e,mode){
  var m=String(e&&e.message||'');
  if(net(e))return 'La base de données ne répond pas. Vérifie Internet, désactive la traduction de la page et les bloqueurs de publicité, puis réessaie.';
  if(/invalid/i.test(m))return mode==='admin'?'Ce compte existe déjà avec un autre mot de passe. Clique sur « Retour à la connexion » et connecte-toi.':'Identifiant ou mot de passe incorrect.';
  return m||'Connexion impossible.';
}
function submit(mode){
  var id=document.getElementById('cbId').value, pw=document.getElementById('cbPw').value;
  setMsg('Un instant…');
  var p=mode==='admin'
    ? retry(function(){return sb.auth.signUp({email:emailOf(id),password:pw}).then(function(r){if(r.error)throw r.error;return r})},2)
        /* compte déjà créé (par exemple quand la réponse s'est perdue) : on se connecte avec */
        .catch(function(e){if(net(e)||/registered|exists/i.test(e&&e.message||''))return retry(function(){return signIn(id,pw)},2);throw e})
        .then(function(r){if(!r.data.session)throw new Error('Compte créé, mais Supabase demande une confirmation par e-mail. Désactive « Confirm email » dans Supabase puis réessaie.');return retry(function(){return q(sb.rpc('devenir_admin'))},2)})
        .then(function(ok){if(!ok){return sb.auth.signOut().then(function(){throw new Error('Un administrateur existe déjà. Connecte-toi avec ton identifiant.')})}})
    : retry(function(){return signIn(id,pw)},1);
  p.then(function(){sansId();return start()},function(e){setMsg(nice(e,mode))});
}
function tmo(p,ms){return Promise.race([p,new Promise(function(_,no){setTimeout(function(){no(new Error('timeout'))},ms)})])}
function showWait(){
  if(!box){box=document.createElement('div');document.body.appendChild(box)}
  box.innerHTML='<div class="cb-login"><div class="cb-card"><div class="cb-logo">f</div><h1>Compte Boost</h1><p class="cb-sub">Connexion à la base de données…</p></div></div>';
}
function profilDe(uid){return retry(function(){return tmo(q(sb.from('profils').select('role,code,nom').eq('user_id',uid).maybeSingle()),15000)},2)}
function start(){
  showWait();
  var last=lsGet('cb-last',null);
  function horsLigne(){
    if(!last)return false;
    session={user:{id:last.uid}};profil=last.profil;UID=last.uid;if(last.off!=null)window.CB_OFF=last.off;
    outbox=lsGet(boxKey(),[]);conflits=lsGet('cb-conflits-'+UID,[]);setOff(true);ouvrir();return true;
  }
  if(!navigator.onLine&&horsLigne())return Promise.resolve();
  return tmo(sb.auth.getSession(),15000).then(function(r){
    session=r.data.session;
    if(!session){if(last&&(!navigator.onLine||r.error&&net(r.error))&&horsLigne())return;showLogin('login');return}
    var uid=session.user.id;
    return Promise.all([profilDe(uid),tmo(q(sb.rpc('heure_serveur')),10000).catch(function(){return null})]).then(function(x){
      if(x[1]){window.CB_OFF=new Date(x[1]).getTime()-Date.now()}
      if(x[0])return x[0];
      /* compte créé mais la réponse s'est perdue avant « devenir administrateur » : on termine l'installation
         (le serveur refuse si un administrateur existe déjà) */
      return retry(function(){return tmo(q(sb.rpc('devenir_admin')),15000)},2).then(function(ok){return ok?profilDe(uid):null});
    }).then(function(p){
      profil=p;
      if(profil){UID=uid;outbox=lsGet(boxKey(),[]);conflits=lsGet('cb-conflits-'+UID,[]);lsSet('cb-last',{uid:uid,profil:profil,off:window.CB_OFF||0});setTimeout(flush,1500)}
      if(!profil){return sb.auth.signOut().then(function(){session=null;showLogin('login','Ce compte n\'a pas d\'accès. Demande à l\'administrateur.')})}
      var pre=lienId();
      if(pre&&String(profil.code||'').toUpperCase()!==pre)return autreCompte(pre);
      ouvrir();
    });
  }).catch(function(e){if(net(e)&&last&&(!session||session.user.id===last.uid)&&horsLigne())return;showLogin('login',nice(e,'login'))});
}
/* Lien d'un employé (?id=CODE) ouvert alors qu'un autre compte est connecté sur ce navigateur */
function lienId(){var v=null;try{v=new URLSearchParams(location.search).get('id')}catch(e){}return v?String(v).toUpperCase().replace(/[^A-Z0-9]/g,''):null}
function sansId(){try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}}
function autreCompte(code){
  if(!box){box=document.createElement('div');document.body.appendChild(box)}
  var qui=profil.role==='admin'?'administrateur':(profil.nom||profil.code||'un autre compte');
  box.innerHTML='<div class="cb-login"><div class="cb-card"><div class="cb-logo">f</div><h1>Compte Boost</h1>'+
    '<p class="cb-sub">Ce lien est celui de l\u2019employé <b>'+esc(code)+'</b>, mais ce navigateur est connecté en <b>'+esc(qui)+'</b>.</p>'+
    '<button type="button" class="cb-btn" id="cbAutre">Ouvrir l\u2019espace de '+esc(code)+'</button>'+
    '<a href="#" id="cbRester" class="cb-link">Rester connecté en '+esc(qui)+'</a></div></div>';
  document.getElementById('cbAutre').onclick=function(){sb.auth.signOut().then(function(){session=null;profil=null;showLogin('login')},function(){showLogin('login')})};
  document.getElementById('cbRester').onclick=function(ev){ev.preventDefault();sansId();ouvrir()};
}
function ouvrir(){
  if(box){box.remove();box=null}
  badge();
  var out=document.createElement('button');out.type='button';out.className='cb-out';out.textContent='Se déconnecter';out.onclick=deconnexion;document.body.appendChild(out);
  resolveReady();
}
var css=document.createElement('style');
css.textContent='.cb-login{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--bg,#eef6fc)}'+
'.cb-card{width:100%;max-width:380px;background:var(--card,#fff);border-radius:18px;padding:28px 22px;box-shadow:0 10px 30px rgba(2,60,110,.12);display:grid;gap:12px}'+
'.cb-card h1{margin:0;font-size:1.4rem;color:var(--title,#0b4f86)}.cb-sub{margin:0;color:var(--muted,#64748b);font-size:.9rem}'+
'.cb-logo{width:44px;height:44px;border-radius:12px;background:#1877f2;color:#fff;font:800 1.6rem/44px system-ui;text-align:center}'+
'.cb-card label{display:grid;gap:4px;font-size:.85rem;font-weight:600;color:var(--title,#0b4f86)}.cb-card input{font-size:16px;padding:11px 12px;border:1px solid var(--line,#cbd5e1);border-radius:10px;background:var(--card,#fff);color:inherit}'+
'.cb-btn{padding:12px;border:0;border-radius:10px;background:#0284c7;color:#fff;font-weight:700;font-size:1rem;cursor:pointer}.cb-msg{min-height:1.2em;color:#dc2626;font-size:.85rem}'+
'.cb-link{font-size:.8rem;color:var(--muted,#64748b);text-align:center}'+
'.cb-net{position:fixed;left:12px;bottom:12px;z-index:41;max-width:min(560px,calc(100vw - 140px));font-size:.78rem;font-weight:600;padding:7px 12px;border-radius:12px;box-shadow:0 4px 14px rgba(2,60,110,.15)}.cb-net.off{background:#fff7d6;color:#7a5200;border:1px solid #f5c400}.cb-net.ok{background:#e7f8ee;color:#067647;border:1px solid #9be0b4}.cb-net.ko{background:#fdecec;color:#b42318;border:1px solid #f4a3a3}'+
'.cb-out{position:fixed;right:12px;bottom:12px;z-index:40;font-size:.75rem;padding:6px 10px;border-radius:999px;border:1px solid var(--line,#cbd5e1);background:var(--card,#fff);color:var(--muted,#475569);cursor:pointer}';
document.head.appendChild(css);
/* Le site lui-même reste disponible sans Internet (copie gardée par le navigateur) */
if('serviceWorker' in navigator&&location.protocol==='https:'){try{navigator.serviceWorker.register('sw.js').catch(function(){})}catch(e){}}
if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
