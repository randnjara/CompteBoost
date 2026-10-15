/* Gestock FB : gestion des ventes, paiements, versements et stocks par page Facebook.
   Même connexion et même base que Compte Boost. Les pages et les employés de Compte Boost sont lus sans être modifiés ;
   les données de Gestock sont rangées à part (collections gs_…). */
(function(){
"use strict";

/* ---------- Outils ---------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function n(v){v=Number(v);return isFinite(v)?v:0}
function fmt(v){v=Math.round(n(v));return (v<0?'-':'')+String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g,' ')}
function ar(v){return fmt(v)+' Ar'}
function rid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function pad(x){return String(x).padStart(2,'0')}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function pd(s){var a=String(s).split('-');return new Date(+a[0],+a[1]-1,+a[2])}
function addD(s,k){var d=pd(s);d.setDate(d.getDate()+k);return ymd(d)}
function today(){return ymd(new Date())}
function dfr(s){if(!s)return '';var a=s.split('-');return a[2]+'/'+a[1]+'/'+a[0]}
var JR=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'], JL=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
var MO=['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'], ML=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function monday(s){var d=pd(s),w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return ymd(d)}
function nowIso(){return new Date().toISOString()}
function normTel(t){return String(t||'').replace(/\D/g,'').replace(/^261/,'0')}
var MODES={especes:'Espèces',mvola:'MVola',orange:'Orange Money',livraison:'À la livraison',autre:'Autre'};
var LIV={a_preparer:'À préparer',prete:'Prête',affectee:'Affectée',en_cours:'En cours',livree:'Livrée',echec:'Échec',retour:'Retour'};
var LIVC={a_preparer:'n',prete:'b',affectee:'p',en_cours:'a',livree:'g',echec:'r',retour:'o'};
var DEPCAT=['Publicité Facebook','Achat marchandises','Livraison','Salaires','Emballages','Loyer','Transport','Autre'];
var COLORS=['#2563eb','#16a34a','#ea580c','#7c3aed','#db2777','#0891b2','#ca8a04','#475569'];

var IC={
 dash:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z', report:'M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6',
 cart:'M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6.2M9 20h.01M18 20h.01', list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
 pay:'M2 6h20v12H2zM2 10h20M6 15h4', wallet:'M20 7H5a2 2 0 0 1 0-4h13v4M3 5v14a2 2 0 0 0 2 2h15V7M16 14h.01',
 undo:'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11', swap:'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
 box:'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
 user:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
 fb:'M15 3h-3a4 4 0 0 0-4 4v3H5v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z', dep:'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
 clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2', gear:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
 chat:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', truck:'M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
 chart:'M3 3v18h18M7 14l4-4 4 4 5-5', cal:'M3 5h18v16H3zM16 3v4M8 3v4M3 10h18', down:'M12 3v12M7 10l5 5 5-5M5 21h14', plus:'M12 5v14M5 12h14',
 edit:'M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z', alert:'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0',
 check:'M20 6 9 17l-5-5', phone:'M7 2h10v20H7zM11 18h2', cash:'M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6', menu:'M3 6h18M3 12h18M3 18h18',
 left:'M15 18l-6-6 6-6', right:'M9 18l6-6-6-6', out:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', sigma:'M18 7V4H6l6 8-6 8h12v-3',
 hand:'M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 16 0v-3a2 2 0 0 0-4 0', trash:'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6'
};
function ic(k,cls){return '<svg class="ico'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+IC[k]+'"/></svg>'}

/* ---------- État ---------- */
var COLS={pages:'pages',membres:'membres',gsPages:'gs_pages',produits:'gs_produits',commandes:'gs_commandes',paiements:'gs_paiements',
  versements:'gs_versements',mouvements:'gs_mouvements',depenses:'gs_depenses',journal:'gs_journal',reglages:'gs_reglages',clients:'gs_clients'};
var S={ready:false,admin:false,me:null,myCode:null,meName:'',db:null,loaded:{},
  view:'rapport',per:{mode:'jour',ref:today(),d1:today(),d2:today()},fPage:'',fVend:'',
  formTab:'nouvelle',sideOpen:false,cmdQ:'',cmdSt:'',livSt:'',prodPage:'',depPage:''};
Object.keys(COLS).forEach(function(k){S[k]={}});
try{var sv=JSON.parse(localStorage.getItem('gs-ui')||'{}');if(sv.view)S.view=sv.view}catch(e){}
function saveUi(){try{localStorage.setItem('gs-ui',JSON.stringify({view:S.view}))}catch(e){}}

/* ---------- Accès ---------- */
function vendeurs(){
  var out=[];
  Object.keys(S.membres).forEach(function(k){if(!/^inv_/.test(k))return;var m=S.membres[k]||{};if(m.archive||m.archivee)return;out.push({id:k,nom:m.nom||k.slice(4)})});
  out.sort(function(a,b){return a.nom.localeCompare(b.nom)});
  if(S.admin)out.push({id:'admin',nom:'Administrateur'});
  return out;
}
function vName(id){if(id==='admin')return 'Administrateur';var m=S.membres[id];return m&&m.nom||(id?String(id).replace(/^inv_/,''):'—')}
function pages(){
  var my=S.myCode?'inv_'+S.myCode:null;
  return Object.keys(S.pages).filter(function(k){var p=S.pages[k]||{};if(p.archivee)return false;return S.admin||p.responsable===my})
    .map(function(k){return {id:k,nom:S.pages[k].nom||k,resp:S.pages[k].responsable||''}}).sort(function(a,b){return a.nom.localeCompare(b.nom)});
}
function pName(id){var p=S.pages[id];return p&&p.nom||'—'}
function allowedPage(pid){if(S.admin)return true;var p=S.pages[pid];return !!p&&p.responsable==='inv_'+S.myCode}
function match(o){
  if(!allowedPage(o.pageId))return false;
  if(S.fPage&&o.pageId!==S.fPage)return false;
  if(S.fVend&&o.vendeurId!==S.fVend)return false;
  return true;
}
function reg(){return S.reglages.general||{}}

/* ---------- Calculs ---------- */
var IDX=null;
function idx(){
  if(IDX)return IDX;
  var pays={}, stock={}, first={};
  Object.keys(S.paiements).forEach(function(id){var p=S.paiements[id];(pays[p.commandeId]=pays[p.commandeId]||[]).push(Object.assign({id:id},p))});
  Object.keys(pays).forEach(function(c){pays[c].sort(function(a,b){return (a.date+(a.le||'')).localeCompare(b.date+(b.le||''))});var f=pays[c].filter(function(p){return p.type!=='remboursement'})[0];if(f)first[c]=f.id});
  Object.keys(S.mouvements).forEach(function(id){var m=S.mouvements[id];stock[m.produitId]=n(stock[m.produitId])+n(m.qte)});
  IDX={pays:pays,stock:stock,first:first};return IDX;
}
function stockOf(pid){return n(idx().stock[pid])}
function retQte(c){return (c.retours||[]).reduce(function(s,r){return s+n(r.qte)},0)}
function eff(c){if(c.statut==='annulee')return 0;var t=n(c.total);(c.retours||[]).forEach(function(r){t-=n(r.montant)});(c.echanges||[]).forEach(function(e){t+=n(e.complement)});return Math.max(0,t)}
function paye(cid){return (idx().pays[cid]||[]).reduce(function(s,p){return s+n(p.montant)},0)}
function reste(c,cid){return c.statut==='annulee'?0:Math.max(0,eff(c)-paye(cid))}
function payState(c,cid){
  if(c.statut==='annulee')return ['Annulée','solidr'];
  var r=reste(c,cid),p=paye(cid);
  if(r<=0)return ['Payé','g'];if(p>0)return ['Partiel','o'];return ['En attente','n'];
}
function cost(c){
  if(c.statut==='annulee')return 0;
  var pr=S.produits[c.produitId]||{}, q=n(c.qte)-retQte(c), t=q*n(pr.achat);
  (c.echanges||[]).forEach(function(e){var a=S.produits[e.produitId]||{};t+=n(e.qte)*(n(a.achat)-n(pr.achat))});
  return Math.max(0,t);
}
function range(){
  var p=S.per,r=p.ref;
  if(p.mode==='jour')return [r,r];
  if(p.mode==='semaine'){var m=monday(r);return [m,addD(m,6)]}
  if(p.mode==='mois'){var d=pd(r);return [ymd(new Date(d.getFullYear(),d.getMonth(),1)),ymd(new Date(d.getFullYear(),d.getMonth()+1,0))]}
  if(p.mode==='annee'){var y=pd(r).getFullYear();return [y+'-01-01',y+'-12-31']}
  return [p.d1<=p.d2?p.d1:p.d2,p.d1<=p.d2?p.d2:p.d1];
}
function prevRange(a,b){
  var p=S.per;
  if(p.mode==='mois'){var d=pd(a);return [ymd(new Date(d.getFullYear(),d.getMonth()-1,1)),ymd(new Date(d.getFullYear(),d.getMonth(),0))]}
  if(p.mode==='annee'){var y=pd(a).getFullYear()-1;return [y+'-01-01',y+'-12-31']}
  var len=Math.round((pd(b)-pd(a))/864e5)+1;return [addD(a,-len),addD(a,-1)];
}
function perLabel(a,b){
  var p=S.per;
  if(p.mode==='jour'){var d=pd(a);return JL[d.getDay()]+' '+dfr(a)}
  if(p.mode==='mois'){var m=pd(a);return ML[m.getMonth()]+' '+m.getFullYear()}
  if(p.mode==='annee')return 'Année '+a.slice(0,4);
  return 'du '+dfr(a)+' au '+dfr(b);
}
function inR(d,a,b){return d>=a&&d<=b}
function stats(a,b,opt){
  opt=opt||{};
  var mt=opt.match||match, X=idx();
  var st={nb:0,nbConf:0,nbAnn:0,ventes:0,cogs:0,realise:0,enc:0,p1:0,p2:0,remb:0,modes:{especes:0,mvola:0,orange:0,autre:0},reste:0,verse:0,liv:{}};
  Object.keys(S.commandes).forEach(function(id){
    var c=S.commandes[id];if(!inR(c.date,a,b)||!mt(c))return;
    st.nb++;
    if(c.statut==='annulee'){st.nbAnn++;return}
    st.nbConf++;st.ventes+=eff(c);st.cogs+=cost(c);st.reste+=reste(c,id);
    var l=c.livraison||'a_preparer';st.liv[l]=(st.liv[l]||0)+1;if(l==='livree')st.realise+=eff(c);
  });
  Object.keys(S.paiements).forEach(function(id){
    var p=S.paiements[id];if(!inR(p.date,a,b)||!mt(p))return;
    var m=n(p.montant);st.enc+=m;
    var k=p.mode==='especes'||p.mode==='livraison'?'especes':p.mode==='mvola'?'mvola':p.mode==='orange'?'orange':'autre';st.modes[k]+=m;
    if(p.type==='remboursement')st.remb+=m;else if(X.first[p.commandeId]===id)st.p1+=m;else st.p2+=m;
  });
  Object.keys(S.versements).forEach(function(id){
    var v=S.versements[id];if(!inR(v.date,a,b))return;
    if(!S.admin&&v.vendeurId!=='inv_'+S.myCode)return;
    if(S.fVend&&v.vendeurId!==S.fVend)return;
    if(S.fPage){var pg=S.pages[S.fPage];if(!pg||pg.responsable!==v.vendeurId)return}
    st.verse+=n(v.montant);
  });
  st.aReverser=st.enc;st.ecart=st.verse-st.aReverser;
  return st;
}
function vendorRows(a,b){
  var rows={}, X=idx();
  function R(v){return rows[v]=rows[v]||{v:v,pages:{},nb:0,ventes:0,p1:0,p2:0,enc:0,es:0,mv:0,or:0,reste:0,verse:0}}
  Object.keys(S.commandes).forEach(function(id){var c=S.commandes[id];if(!inR(c.date,a,b)||!match(c))return;var r=R(c.vendeurId||'');r.pages[c.pageId]=1;if(c.statut==='annulee')return;r.nb++;r.ventes+=eff(c);r.reste+=reste(c,id)});
  Object.keys(S.paiements).forEach(function(id){var p=S.paiements[id];if(!inR(p.date,a,b)||!match(p))return;var r=R(p.vendeurId||''),m=n(p.montant);r.pages[p.pageId]=1;r.enc+=m;
    if(p.type!=='remboursement'){if(X.first[p.commandeId]===id)r.p1+=m;else r.p2+=m}
    if(p.mode==='mvola')r.mv+=m;else if(p.mode==='orange')r.or+=m;else r.es+=m});
  Object.keys(S.versements).forEach(function(id){var v=S.versements[id];if(!inR(v.date,a,b))return;if(!S.admin&&v.vendeurId!=='inv_'+S.myCode)return;if(S.fVend&&v.vendeurId!==S.fVend)return;
    if(S.fPage){var pg=S.pages[S.fPage];if(!pg||pg.responsable!==v.vendeurId)return}R(v.vendeurId).verse+=n(v.montant)});
  return Object.keys(rows).map(function(k){var r=rows[k];r.aRev=r.enc;r.ecart=r.verse-r.aRev;return r}).sort(function(x,y){return y.ventes-x.ventes});
}

/* ---------- Écriture ---------- */
function col(k){return S.db.collection(COLS[k])}
function journal(action,detail){if(!S.db)return Promise.resolve();return col('journal').doc(rid()).set({le:nowIso(),par:S.meName||'',parId:S.me||'',action:action,detail:detail||''}).catch(function(){})}
function fail(e){
  var m=String(e&&e.message||e||'Erreur');
  if(/row-level|permission|policy|42501/i.test(m))m='Ton compte n’a pas encore le droit d’enregistrer dans Gestock. L’administrateur doit activer l’accès employé (fichier supabase/gestock.sql).';
  toast(m,true);throw e;
}
var toastT=null;
function toast(t,ko){var el=document.querySelector('.toast');if(!el){el=document.createElement('div');document.body.appendChild(el)}el.className='toast'+(ko?' ko':'');el.textContent=t;el.style.display='';clearTimeout(toastT);toastT=setTimeout(function(){el.style.display='none'},ko?6000:3000)}
function nextNum(){var mx=0;Object.keys(S.commandes).forEach(function(k){var m=/(\d+)$/.exec(S.commandes[k].num||'');if(m)mx=Math.max(mx,+m[1])});return 'CMD-'+String(mx+1).padStart(5,'0')}
function mvt(o){return col('mouvements').doc(rid()).set(Object.assign({date:today(),le:nowIso(),par:S.meName||''},o))}

/* ---------- Rendu ---------- */
var raf=0;
function soft(){IDX=null;if(raf)return;raf=requestAnimationFrame(function(){raf=0;render()})}
function keepForm(fn){
  var app=document.getElementById('app'), vals={}, act=document.activeElement, aid=act&&act.id, sel=null;
  app.querySelectorAll('input[id],select[id],textarea[id]').forEach(function(el){vals[el.id]=el.type==='checkbox'?el.checked:el.value});
  var msgs={};app.querySelectorAll('.msg[id]').forEach(function(el){if(el.textContent)msgs[el.id]=[el.textContent,el.className]});
  try{if(act&&act.selectionStart!=null)sel=[act.selectionStart,act.selectionEnd]}catch(e){}
  var sc=window.scrollY;
  fn();
  Object.keys(vals).forEach(function(id){var el=document.getElementById(id);if(!el||el.dataset.fixed)return;if(el.type==='checkbox')el.checked=vals[id];else if(el.tagName==='SELECT'){if([].some.call(el.options,function(o){return o.value===vals[id]}))el.value=vals[id]}else el.value=vals[id]});
  Object.keys(msgs).forEach(function(id){var el=document.getElementById(id);if(el){el.textContent=msgs[id][0];el.className=msgs[id][1]}});
  if(aid){var f=document.getElementById(aid);if(f){f.focus();try{if(sel)f.setSelectionRange(sel[0],sel[1])}catch(e){}}}
  window.scrollTo(0,sc);
  recalc();
}
var NAV=[
 ['rapport','Rapport gérante','report'],['saisie','Enregistrer commande','cart'],['commandes','Commandes','list'],['paiements','Paiements clients','pay'],
 ['versements','Versements vendeurs','wallet'],['annulations','Annulations / Retours','undo'],['echanges','Échanges','swap'],['produits','Produits & Stocks','box'],
 ['clients','Clients','user'],['livraisons','Livraisons','truck'],['sep'],['pagesfb','Pages Facebook','fb'],['ia','Messagerie IA','chat',1],['depenses','Dépenses & bénéfices','dep'],
 ['employes','Employés','users'],['rapports','Rapports','chart'],['historique','Historique','clock'],['parametres','Paramètres','gear']
];
function render(){
  var app=document.getElementById('app');
  if(!S.ready){app.innerHTML='<div class="wait">Chargement de Gestock FB…</div>';return}
  keepForm(function(){
    var v=S.view, body=(VIEWS[v]||VIEWS.rapport)();
    app.innerHTML=(window.GS_DEMO?'<div class="demo">Démonstration : données fictives, rien n’est enregistré.</div>':'')+
    '<div class="app"><aside class="side'+(S.sideOpen?' open':'')+'"><div class="brand"><div class="lg">'+ic('box')+'</div><div><b>Gestock FB</b><small>'+(S.admin?'Espace gérante':'Espace vendeur')+'</small></div></div>'+
    '<nav class="nav">'+NAV.map(function(x){if(x[0]==='sep')return '<div class="sep"></div>';if(!S.admin&&/^(parametres|employes|depenses|historique)$/.test(x[0]))return '';return '<button data-nav="'+x[0]+'" class="'+(v===x[0]?'on':'')+'">'+ic(x[2])+'<span>'+x[1]+'</span>'+(x[3]?'<span class="soon">BIENTÔT</span>':'')+'</button>'}).join('')+'</nav>'+
    '<div class="foot">'+esc(S.meName||'')+'<br><a href="../">← Compte Boost</a>'+(window.CB_WEB?' · <a href="#" data-act="logout">Se déconnecter</a>':'')+'</div></aside>'+
    '<main class="main">'+body+'</main></div><dialog id="dlg"></dialog>';
  });
}
function head(title,sub,icon,extra){
  return '<div class="top"><div class="ttl"><button class="btn burger" data-act="menu" aria-label="Menu">'+ic('menu')+'</button><div class="ic">'+ic(icon||'report')+'</div><div><h1>'+esc(title)+'</h1><p>'+sub+'</p></div></div>'+(extra||'')+'</div>';
}
function filtersHtml(opts){
  opts=opts||{};
  var r=range(), p=S.per, pv=p.mode==='jour'&&p.ref===today()?'auj':p.mode==='jour'&&p.ref===addD(today(),-1)?'hier':p.mode==='semaine'?'sem':p.mode==='mois'?'mois':p.mode==='annee'?'an':p.mode==='perso'?'perso':'jour';
  var ps=pages(), vs=vendeurs();
  return '<div class="filters">'+
   '<label class="fld">Période<select data-ch="preset">'+[['auj','Aujourd’hui'],['hier','Hier'],['sem','Cette semaine'],['mois','Ce mois'],['an','Cette année'],['perso','Période personnalisée'],['jour','Jour choisi']].filter(function(o){return o[0]!=='jour'||pv==='jour'}).map(function(o){return '<option value="'+o[0]+'"'+(o[0]===pv?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select><small>'+esc(perLabel(r[0],r[1]))+'</small></label>'+
   (p.mode==='perso'?'<label class="fld">Du<input type="date" data-ch="d1" value="'+p.d1+'" data-fixed="1"></label><label class="fld">Au<input type="date" data-ch="d2" value="'+p.d2+'" data-fixed="1"></label>':'')+
   '<label class="fld">Page Facebook<select data-ch="fPage" data-fixed="1"><option value="">Toutes les pages</option>'+ps.map(function(x){return '<option value="'+esc(x.id)+'"'+(S.fPage===x.id?' selected':'')+'>'+esc(x.nom)+'</option>'}).join('')+'</select></label>'+
   (S.admin?'<label class="fld">Vendeur<select data-ch="fVend" data-fixed="1"><option value="">Tous les vendeurs</option>'+vs.map(function(x){return '<option value="'+esc(x.id)+'"'+(S.fVend===x.id?' selected':'')+'>'+esc(x.nom)+'</option>'}).join('')+'</select></label>':'')+
   '<button class="btn g" data-act="auj">'+ic('cal')+'Aujourd’hui</button>'+
   (opts.noExport?'':'<button class="btn b" data-act="export">'+ic('down')+'Exporter</button>')+
  '</div>';
}
function perBar(){
  var p=S.per, r=range(), items=[], i;
  if(p.mode==='jour'){for(i=-5;i<=1;i++){var d=addD(p.ref,i),dd=pd(d);items.push({ref:d,a:(d===today()?'Aujourd’hui':JR[dd.getDay()]),b:(d===today()?JR[dd.getDay()]+' ':'')+dfr(d),on:d===p.ref})}}
  else if(p.mode==='semaine'){var m=monday(p.ref);for(i=-4;i<=1;i++){var w=addD(m,i*7);items.push({ref:w,a:'Sem. du',b:dfr(w).slice(0,5)+' au '+dfr(addD(w,6)).slice(0,5),on:i===0})}}
  else if(p.mode==='mois'){var dm=pd(p.ref);for(i=-4;i<=1;i++){var x=new Date(dm.getFullYear(),dm.getMonth()+i,1);items.push({ref:ymd(x),a:MO[x.getMonth()],b:String(x.getFullYear()),on:i===0})}}
  else if(p.mode==='annee'){var y=pd(p.ref).getFullYear();for(i=-3;i<=1;i++)items.push({ref:(y+i)+'-06-15',a:'Année',b:String(y+i),on:i===0})}
  return '<div class="perbar no-print"><div class="seg">'+[['jour','Par jour'],['semaine','Par semaine'],['mois','Par mois'],['annee','Par année'],['perso','Par période']].map(function(o){return '<button data-mode="'+o[0]+'" class="'+(p.mode===o[0]?'on':'')+'">'+ic('cal')+o[1]+'</button>'}).join('')+'</div>'+
   (items.length?'<div class="strip"><button class="arr" data-shift="-1" aria-label="Précédent">'+ic('left')+'</button>'+items.map(function(it){return '<button class="d'+(it.on?' on':'')+'" data-ref="'+it.ref+'"><b>'+esc(it.a)+'</b><small>'+esc(it.b)+'</small></button>'}).join('')+'<button class="arr" data-shift="1" aria-label="Suivant">'+ic('right')+'</button></div>':'<div class="muted">'+esc(perLabel(r[0],r[1]))+'</div>')+'</div>';
}
function delta(cur,prev){if(!prev)return cur?'':'';var d=Math.round((cur-prev)/Math.abs(prev)*100);return '<span class="'+(d>=0?'up':'down')+'">'+(d>=0?'↑ +':'↓ ')+d+'%</span> vs période préc.'}
function kpis(st,pv){
  var tot=st.enc||1;
  function k(cls,icon,l,v,s){return '<div class="kpi '+cls+'"><div class="ki">'+ic(icon)+'</div><div style="min-width:0"><div class="kl">'+l+'</div><div class="kv">'+v+'</div><div class="ks">'+(s||'&nbsp;')+'</div></div></div>'}
  function pc(x){return st.enc?Math.round(x/tot*100)+'%':'0%'}
  return '<div class="kpis">'+
   k('solid cb','cart','Total ventes confirmées',ar(st.ventes),delta(st.ventes,pv.ventes))+
   k('solid cg','wallet','Total encaissé',ar(st.enc),delta(st.enc,pv.enc))+
   k('tg','cash','Espèces',ar(st.modes.especes),pc(st.modes.especes))+
   k('tb','phone','MVola',ar(st.modes.mvola),pc(st.modes.mvola))+
   k('to','phone','Orange Money',ar(st.modes.orange),pc(st.modes.orange))+
   k('tr','alert','Reste impayé',ar(st.reste),st.ventes?Math.round(st.reste/st.ventes*100)+'% des ventes':'')+
   k('tp','swap','Total à reverser',ar(st.aReverser),'par les vendeurs')+
   k('solid cg2','check','Déjà versé',ar(st.verse),st.ecart<0?'Manque '+ar(-st.ecart):'Caisse à jour')+
  '</div>';
}
function avatar(name,i){return '<span class="av" style="background:'+COLORS[i%COLORS.length]+'">'+esc((name||'?').trim().charAt(0).toUpperCase())+'</span>'}
function statutVers(r){if(r.aRev<=0&&r.verse<=0)return '<span class="tag n">—</span>';if(r.ecart>=0)return '<span class="tag g">'+ic('check')+'Versé</span>';if(r.verse>0)return '<span class="tag o">Partiel</span>';return '<span class="tag r">Non versé</span>'}
function vendorTable(a,b){
  var rows=vendorRows(a,b), T={nb:0,ventes:0,p1:0,p2:0,enc:0,es:0,mv:0,or:0,reste:0,aRev:0,verse:0,ecart:0};
  rows.forEach(function(r){Object.keys(T).forEach(function(k){T[k]+=r[k]})});
  var lbl=S.per.mode==='jour'?(S.per.ref===today()?'aujourd’hui':JL[pd(a).getDay()].toLowerCase()):'période';
  return '<div class="card"><div class="hd"><h2>Tableau des versements par vendeur · '+esc(perLabel(a,b))+'</h2>'+(S.per.mode==='jour'&&S.per.ref===today()?'<span class="tag solidr">Aujourd’hui</span>':'')+'</div>'+
  '<div class="tw"><table><thead><tr class="grp"><th class="l" colspan="3"></th><th class="c" colspan="4">Ventes (Ar)</th><th class="c" colspan="3">Encaissé par mode</th><th class="th-rest"></th><th class="c th-ver" colspan="3">Versement au gérant</th><th colspan="2"></th></tr>'+
  '<tr><th class="l">Vendeur</th><th class="l">Page Facebook</th><th>Commandes</th><th>Total</th><th>1er paiement</th><th>2ème paiement</th><th>Total encaissé</th><th class="cE">Espèces</th><th class="cM">MVola</th><th class="cO">Orange</th><th class="th-rest">Reste impayé</th><th class="th-ver">À reverser</th><th class="th-ver">Montant versé</th><th class="th-ver">Écart</th><th class="c">Statut</th><th class="c">Action</th></tr></thead><tbody>'+
  (rows.length?rows.map(function(r,i){var nm=vName(r.v);return '<tr><td class="l"><span class="who">'+avatar(nm,i)+esc(nm)+'</span></td><td class="l">'+esc(Object.keys(r.pages).map(pName).join(', '))+'</td><td>'+r.nb+'</td><td><b>'+fmt(r.ventes)+'</b></td><td>'+fmt(r.p1)+'</td><td>'+fmt(r.p2)+'</td><td><b>'+fmt(r.enc)+'</b></td><td class="cE">'+fmt(r.es)+'</td><td class="cM">'+fmt(r.mv)+'</td><td class="cO">'+fmt(r.or)+'</td><td class="cR">'+fmt(r.reste)+'</td><td>'+fmt(r.aRev)+'</td><td>'+fmt(r.verse)+'</td><td class="'+(r.ecart<0?'cR':'')+'">'+fmt(r.ecart)+'</td><td class="c">'+statutVers(r)+'</td><td class="c">'+(S.admin&&r.v?'<button class="ib" data-vers="'+esc(r.v)+'" title="Enregistrer un versement">'+ic('edit')+'</button>':'')+'</td></tr>'}).join(''):'<tr><td colspan="16" class="empty">Aucune vente ni versement sur cette période.</td></tr>')+
  '</tbody><tfoot><tr><td class="l" colspan="2">Total '+esc(lbl)+'</td><td>'+T.nb+'</td><td>'+fmt(T.ventes)+'</td><td>'+fmt(T.p1)+'</td><td>'+fmt(T.p2)+'</td><td>'+fmt(T.enc)+'</td><td class="cE">'+fmt(T.es)+'</td><td class="cM">'+fmt(T.mv)+'</td><td class="cO">'+fmt(T.or)+'</td><td class="cR">'+fmt(T.reste)+'</td><td>'+fmt(T.aRev)+'</td><td>'+fmt(T.verse)+'</td><td class="'+(T.ecart<0?'cR':'')+'">'+fmt(T.ecart)+'</td><td colspan="2"></td></tr></tfoot></table></div></div>';
}
function synthese(st){
  function row(col,icon,l,v,cls){return '<div class="row"><span class="ki" style="background:var(--'+col+'bg);color:var(--'+col+')">'+ic(icon)+'</span><span>'+l+'</span><b class="'+(cls||'')+'">'+v+'</b></div>'}
  var p=S.per;
  return '<div class="card syn"><div class="hd"><h2>Synthèse de la période</h2></div><div class="tabs no-print">'+[['jour','Jour'],['semaine','Semaine'],['mois','Mois'],['annee','Année'],['perso','Période']].map(function(o){return '<button data-mode="'+o[0]+'" class="'+(p.mode===o[0]?'on':'')+'">'+o[1]+'</button>'}).join('')+'</div><div class="bd">'+
  row('blue','cart','Total ventes confirmées',ar(st.ventes))+row('green','wallet','Total encaissé',ar(st.enc))+row('green','cash','Espèces',ar(st.modes.especes))+
  row('blue','phone','MVola',ar(st.modes.mvola))+row('orange','phone','Orange Money',ar(st.modes.orange))+(st.modes.autre?row('purple','pay','Autres moyens',ar(st.modes.autre)):'')+
  row('red','alert','Reste impayé',ar(st.reste),'cR')+row('purple','swap','Total à reverser (vendeurs)',ar(st.aReverser),'cP')+row('green','check','Déjà versé',ar(st.verse),'cE')+
  row('gray','sigma','Écart de caisse',ar(st.ecart),st.ecart<0?'cR':'')+
  '<div class="row"><span class="muted" style="flex:1">Commandes reçues '+st.nb+' · confirmées '+st.nbConf+' · annulées '+st.nbAnn+'</span></div></div></div>';
}

/* ----- Formulaire commande ----- */
function optsPages(sel){return pages().map(function(x){return '<option value="'+esc(x.id)+'"'+(x.id===sel?' selected':'')+'>'+esc(x.nom)+'</option>'}).join('')}
function optsProduits(pid,sel,withEmpty){
  var l=Object.keys(S.produits).filter(function(k){var p=S.produits[k];return p.pageId===pid&&!p.archive}).sort(function(a,b){return S.produits[a].nom.localeCompare(S.produits[b].nom)});
  return (withEmpty?'<option value="">— Choisir —</option>':'')+l.map(function(k){var p=S.produits[k],s=stockOf(k);return '<option value="'+esc(k)+'"'+(k===sel?' selected':'')+'>'+esc(p.nom)+' · '+fmt(p.prix)+' Ar · stock '+s+'</option>'}).join('');
}
function optsModes(sel){var m=Object.assign({},MODES);(reg().modes||[]).forEach(function(x){if(x)m['x_'+x]=x});return Object.keys(m).map(function(k){return '<option value="'+esc(k)+'"'+(k===sel?' selected':'')+'>'+esc(m[k])+'</option>'}).join('')}
function modeName(k){return MODES[k]||(k&&k.indexOf('x_')===0?k.slice(2):k||'—')}
function clientList(){
  var seen={}, out=[];
  Object.keys(S.commandes).forEach(function(k){var c=S.commandes[k];if(!allowedPage(c.pageId))return;var key=normTel(c.tel)||c.client;if(!key||seen[key])return;seen[key]=1;out.push({nom:c.client,tel:c.tel,adresse:c.adresse||''})});
  return out;
}
function formCommande(){
  var ps=pages(), pid=(document.getElementById('fcPage')||{}).value||S.fPage||(ps[0]&&ps[0].id)||'';
  var cl=clientList();
  return '<div class="card"><div class="hd green"><span class="num">1</span><h2>Enregistrement commande (Vendeur)</h2></div>'+
  '<div class="tabs"><button data-ftab="nouvelle" class="'+(S.formTab==='nouvelle'?'on':'')+'">Nouvelle commande</button><button data-ftab="complement" class="'+(S.formTab==='complement'?'on':'')+'">Paiement complémentaire</button></div>'+
  (S.formTab==='complement'?'<div class="bd">'+formPaiement('fp2')+'</div>':
  '<div class="bd"><div class="cmdgrid"><div class="form">'+
   '<label class="lab"><span>Page Facebook <b class="req">*</b></span><select id="fcPage" data-re="1">'+optsPages(pid)+'</select></label>'+
   '<label class="lab">Vendeur<select id="fcVend">'+vendeurs().filter(function(v){return S.admin||v.id==='inv_'+S.myCode}).map(function(v){var def=(S.pages[pid]||{}).responsable;return '<option value="'+esc(v.id)+'"'+(v.id===def?' selected':'')+'>'+esc(v.nom)+'</option>'}).join('')+'</select></label>'+
   '<label class="lab"><span>Client <b class="req">*</b></span><input id="fcClient" list="dlClients" placeholder="Nom du client" autocomplete="off"></label>'+
   '<datalist id="dlClients">'+cl.map(function(c){return '<option value="'+esc(c.nom)+'">'+esc(c.tel||'')+'</option>'}).join('')+'</datalist>'+
   '<div class="f2"><label class="lab">Téléphone<input id="fcTel" inputmode="tel" placeholder="034 00 000 00"></label><label class="lab">Adresse<input id="fcAdr" placeholder="Quartier, ville"></label></div>'+
   '<label class="lab"><span>Produit <b class="req">*</b></span><select id="fcProd" data-re="pu">'+optsProduits(pid,'',true)+'</select></label>'+
   '<div class="f2"><label class="lab">Prix unitaire<input id="fcPu" type="number" min="0" inputmode="numeric"></label><label class="lab">Quantité<input id="fcQte" type="number" min="1" value="1" inputmode="numeric"></label></div>'+
   '<label class="lab">Frais de livraison<input id="fcLiv" type="number" min="0" value="'+n((S.gsPages[pid]||{}).fraisLivraison)+'" inputmode="numeric"></label>'+
   '<div class="totl"><span>Total</span><span id="fcTot">0 Ar</span></div>'+
  '</div><div class="form"><div class="paybox"><h3>Paiements</h3>'+
   '<div class="sub">1er paiement</div><div class="f3"><label class="lab">Montant<input id="fcM1" type="number" min="0" inputmode="numeric"></label><label class="lab">Date<input id="fcD1" type="date" value="'+today()+'"></label><label class="lab">Mode<select id="fcO1">'+optsModes('especes')+'</select></label></div>'+
   '<div class="sub">2ème paiement</div><div class="f3"><label class="lab">Montant<input id="fcM2" type="number" min="0" inputmode="numeric"></label><label class="lab">Date<input id="fcD2" type="date" value="'+today()+'"></label><label class="lab">Mode<select id="fcO2">'+optsModes('mvola')+'</select></label></div>'+
   '<div class="restel"><span>Reste impayé</span><span id="fcReste">0 Ar</span></div></div>'+
   '<div class="msg" id="fcMsg"></div>'+
   '<button class="btn g w" data-act="saveCmd">'+ic('check')+'Enregistrer la commande</button>'+
   '<p class="muted" style="margin:0;font-size:11px">Une simple demande de prix n’est pas une commande : enregistre seulement les commandes confirmées par le client.</p>'+
  '</div></div></div>')+'</div>';
}
function cmdOptions(filter,sel){
  var l=Object.keys(S.commandes).filter(function(k){var c=S.commandes[k];return allowedPage(c.pageId)&&(!filter||filter(c,k))}).sort(function(a,b){return (S.commandes[b].num||'').localeCompare(S.commandes[a].num||'')}).slice(0,300);
  return '<option value="">— Choisir —</option>'+l.map(function(k){var c=S.commandes[k];return '<option value="'+esc(k)+'"'+(k===sel?' selected':'')+'>'+esc(c.num+' · '+c.client+' · '+c.produit+' · reste '+fmt(reste(c,k)))+'</option>'}).join('');
}
function formPaiement(px){
  return '<div class="form"><label class="lab">Commande<select id="'+px+'Cmd" data-re="fp">'+cmdOptions(function(c,k){return c.statut!=='annulee'&&reste(c,k)>0})+'</select></label>'+
  '<div class="f2"><label class="lab">Montant<input id="'+px+'M" type="number" min="0" inputmode="numeric"></label><label class="lab">Date<input id="'+px+'D" type="date" value="'+today()+'"></label></div>'+
  '<label class="lab">Mode<select id="'+px+'O">'+optsModes('mvola')+'</select></label><div class="msg" id="'+px+'Msg"></div>'+
  '<button class="btn g w" data-pay="'+px+'">'+ic('check')+'Enregistrer le paiement</button></div>';
}
function actionsCard(){
  var notAnn=function(c){return c.statut!=='annulee'};
  return '<div class="card"><div class="hd navy"><span class="num">2</span><h2>Actions sur la commande</h2></div><div class="bd"><div class="cmdgrid">'+
  '<div class="mini"><div class="mh b">'+ic('pay')+'Paiement complémentaire</div><div class="mb">'+formPaiement('fp')+'</div></div>'+
  '<div class="mini"><div class="mh r">'+ic('undo')+'Annulation commande</div><div class="mb form">'+
    '<label class="lab">Commande<select id="faCmd" data-re="fa">'+cmdOptions(notAnn)+'</select></label>'+
    '<label class="lab">Motif<select id="faMotif">'+['Client annule','Injoignable','Rupture de stock','Erreur de saisie','Autre'].map(function(x){return '<option>'+x+'</option>'}).join('')+'</select></label>'+
    '<div class="f2"><label class="chk"><input type="checkbox" id="faRemb">Rembourser le client</label><label class="lab">Montant<input id="faM" type="number" min="0"></label></div>'+
    '<div class="f2"><label class="chk"><input type="checkbox" id="faAvoir">Avoir client</label><label class="lab">Mode<select id="faO">'+optsModes('especes')+'</select></label></div>'+
    '<div class="msg" id="faMsg"></div><button class="btn r w" data-act="annuler">Confirmer l’annulation</button></div></div>'+
  '<div class="mini"><div class="mh o">'+ic('undo')+'Retour produit</div><div class="mb form">'+
    '<label class="lab">Commande<select id="frCmd" data-re="fr">'+cmdOptions(function(c){return notAnn(c)&&n(c.qte)-retQte(c)>0})+'</select></label>'+
    '<div class="f2"><label class="lab">Quantité retournée<input id="frQ" type="number" min="1" value="1"></label><label class="lab">Rembourser<input id="frM" type="number" min="0"></label></div>'+
    '<label class="lab">État du produit<select id="frEtat"><option value="bon">Bon état (remis en stock)</option><option value="abime">Endommagé (stock non remis)</option></select></label>'+
    '<label class="lab">Mode du remboursement<select id="frO">'+optsModes('especes')+'</select></label>'+
    '<div class="msg" id="frMsg"></div><button class="btn o w" data-act="retour">Valider le retour</button></div></div>'+
  '<div class="mini"><div class="mh p">'+ic('swap')+'Échange produit</div><div class="mb form">'+
    '<label class="lab">Commande<select id="feCmd" data-re="fe">'+cmdOptions(notAnn)+'</select></label>'+
    '<label class="lab">Nouveau produit<select id="feProd" data-re="fe">'+(function(){var c=S.commandes[(document.getElementById('feCmd')||{}).value];return c?optsProduits(c.pageId,'',true):'<option value="">— Choisir la commande —</option>'})()+'</select></label>'+
    '<div class="f2"><label class="lab">Quantité<input id="feQ" type="number" min="1" value="1"></label><label class="lab">Complément<input id="feC" readonly></label></div>'+
    '<div class="f2"><label class="lab">Payé maintenant<input id="feM" type="number" min="0"></label><label class="lab">Mode<select id="feO">'+optsModes('especes')+'</select></label></div>'+
    '<div class="msg" id="feMsg"></div><button class="btn p w" data-act="echange">Valider l’échange</button></div></div>'+
  '</div></div></div>';
}
function cmdTable(list,opts){
  opts=opts||{};
  if(!list.length)return '<div class="empty">'+(opts.empty||'Aucune commande.')+'</div>';
  return '<div class="tw"><table><thead><tr><th class="l">#</th>'+(opts.date?'<th class="l">Date</th>':'')+'<th class="l">Client</th>'+(opts.full?'<th class="l">Téléphone</th><th class="l">Page</th><th class="l">Vendeur</th>':'')+'<th class="l">Produit</th>'+(opts.full?'<th>Qté</th>':'')+'<th>Montant</th><th>Paiements</th><th>Reste</th><th class="c">Statut</th>'+(opts.liv?'<th class="c">Livraison</th>':'')+'</tr></thead><tbody>'+
  list.map(function(k){var c=S.commandes[k],s=payState(c,k),pr=c.produit+((c.echanges||[]).length?' → '+c.echanges[c.echanges.length-1].produit:'');
    return '<tr><td class="l">'+esc(c.num)+'</td>'+(opts.date?'<td class="l">'+dfr(c.date)+'</td>':'')+'<td class="l">'+esc(c.client)+'</td>'+(opts.full?'<td class="l">'+esc(c.tel||'')+'</td><td class="l">'+esc(pName(c.pageId))+'</td><td class="l">'+esc(vName(c.vendeurId))+'</td>':'')+'<td class="l">'+esc(pr)+(retQte(c)?' <span class="tag o">retour '+retQte(c)+'</span>':'')+'</td>'+(opts.full?'<td>'+(n(c.qte)-retQte(c))+'</td>':'')+'<td>'+fmt(c.statut==='annulee'?c.total:eff(c))+'</td><td>'+fmt(paye(k))+'</td><td class="'+(reste(c,k)?'cR':'')+'">'+fmt(reste(c,k))+'</td><td class="c"><span class="tag '+s[1]+'">'+s[0]+'</span></td>'+
    (opts.liv?'<td class="c">'+(c.statut==='annulee'?'—':'<select class="in" style="height:28px" data-liv="'+esc(k)+'" data-fixed="1">'+Object.keys(LIV).map(function(l){return '<option value="'+l+'"'+((c.livraison||'a_preparer')===l?' selected':'')+'>'+LIV[l]+'</option>'}).join('')+'</select>')+'</td>':'')+'</tr>'}).join('')+'</tbody></table></div>';
}
function cmdsIn(a,b,f){return Object.keys(S.commandes).filter(function(k){var c=S.commandes[k];return inR(c.date,a,b)&&match(c)&&(!f||f(c,k))}).sort(function(x,y){return (S.commandes[y].num||'').localeCompare(S.commandes[x].num||'')})}

/* ---------- Vues ---------- */
var VIEWS={};
VIEWS.rapport=function(){
  var r=range(), st=stats(r[0],r[1]), pr=prevRange(r[0],r[1]), pv=stats(pr[0],pr[1]);
  var t=today(), jour=cmdsIn(t,t);
  return head('Rapport Gérante','Suivi des ventes, paiements et versements par vendeur et par page','report',filtersHtml())+
   kpis(st,pv)+perBar()+
   '<div class="grid2">'+vendorTable(r[0],r[1])+synthese(st)+'</div>'+
   '<div class="grid3">'+formCommande()+actionsCard()+
   '<div class="card"><div class="hd"><h2>Commandes du jour · '+dfr(t)+'</h2><span class="sp"></span><button class="btn sm" data-nav="commandes">Voir tout</button></div>'+cmdTable(jour.slice(0,12),{empty:'Aucune commande aujourd’hui.'})+'</div></div>';
};
VIEWS.saisie=function(){
  return head('Enregistrer une commande','Commande confirmée par le client, paiements et actions','cart')+
  '<div class="grid3" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">'+formCommande()+actionsCard()+'</div>';
};
VIEWS.commandes=function(){
  var r=range(), q=S.cmdQ.toLowerCase();
  var l=cmdsIn(r[0],r[1],function(c,k){
    if(S.cmdSt){var s=payState(c,k)[0];if(S.cmdSt==='annulee'?c.statut!=='annulee':S.cmdSt==='payee'?s!=='Payé':S.cmdSt==='impayee'?(c.statut==='annulee'||reste(c,k)<=0):false)return false}
    if(q&&(c.num+' '+c.client+' '+(c.tel||'')+' '+c.produit).toLowerCase().indexOf(q)<0)return false;return true});
  var st=stats(r[0],r[1]);
  return head('Commandes',esc(perLabel(r[0],r[1]))+' · '+st.nb+' reçues · '+st.nbConf+' confirmées · '+st.nbAnn+' annulées','list',filtersHtml())+perBar()+
  '<div class="card"><div class="hd"><input class="in" id="cmdQ" data-ch="cmdQ" placeholder="Rechercher (n°, client, téléphone, produit)" value="'+esc(S.cmdQ)+'" style="flex:1;min-width:180px" data-fixed="1">'+
  '<select class="in" data-ch="cmdSt" data-fixed="1">'+[['','Tous les statuts'],['payee','Payées'],['impayee','Reste à payer'],['annulee','Annulées']].map(function(o){return '<option value="'+o[0]+'"'+(S.cmdSt===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></div>'+
  cmdTable(l,{full:1,date:1,liv:1})+'</div>';
};
VIEWS.paiements=function(){
  var r=range(), l=Object.keys(S.paiements).filter(function(k){var p=S.paiements[k];return inR(p.date,r[0],r[1])&&match(p)}).sort(function(a,b){return (S.paiements[b].date+(S.paiements[b].le||'')).localeCompare(S.paiements[a].date+(S.paiements[a].le||''))}), st=stats(r[0],r[1]), X=idx();
  return head('Paiements clients',esc(perLabel(r[0],r[1]))+' · encaissé '+ar(st.enc),'pay',filtersHtml())+perBar()+
  '<div class="card"><div class="tw"><table><thead><tr><th class="l">Date</th><th class="l">Commande</th><th class="l">Client</th><th class="l">Page</th><th class="l">Vendeur</th><th class="l">Mode</th><th class="l">Type</th><th>Montant</th></tr></thead><tbody>'+
  (l.length?l.map(function(k){var p=S.paiements[k],c=S.commandes[p.commandeId]||{};return '<tr><td class="l">'+dfr(p.date)+'</td><td class="l">'+esc(c.num||'')+'</td><td class="l">'+esc(c.client||'')+'</td><td class="l">'+esc(pName(p.pageId))+'</td><td class="l">'+esc(vName(p.vendeurId))+'</td><td class="l">'+esc(modeName(p.mode))+'</td><td class="l">'+(p.type==='remboursement'?'<span class="tag r">Remboursement</span>':X.first[p.commandeId]===k?'<span class="tag b">1er paiement</span>':'<span class="tag p">Complément</span>')+'</td><td class="'+(n(p.montant)<0?'cR':'')+'"><b>'+fmt(p.montant)+'</b></td></tr>'}).join(''):'<tr><td colspan="8" class="empty">Aucun paiement sur cette période.</td></tr>')+
  '</tbody></table></div></div>';
};
VIEWS.versements=function(){
  var r=range(), l=Object.keys(S.versements).filter(function(k){var v=S.versements[k];return inR(v.date,r[0],r[1])&&(S.admin||v.vendeurId==='inv_'+S.myCode)&&(!S.fVend||v.vendeurId===S.fVend)}).sort(function(a,b){return (S.versements[b].date).localeCompare(S.versements[a].date)});
  return head('Versements vendeurs','Argent remis par chaque vendeur à la gérante','wallet',filtersHtml())+perBar()+'<div class="stack">'+vendorTable(r[0],r[1])+
  '<div class="card"><div class="hd"><h2>Versements enregistrés</h2><span class="sp"></span>'+(S.admin?'<button class="btn g sm" data-vers="">'+ic('plus')+'Nouveau versement</button>':'')+'</div><div class="tw"><table><thead><tr><th class="l">Date</th><th class="l">Vendeur</th><th class="l">Mode</th><th class="l">Note</th><th>Montant</th>'+(S.admin?'<th></th>':'')+'</tr></thead><tbody>'+
  (l.length?l.map(function(k){var v=S.versements[k];return '<tr><td class="l">'+dfr(v.date)+'</td><td class="l">'+esc(vName(v.vendeurId))+'</td><td class="l">'+esc(modeName(v.mode))+'</td><td class="l">'+esc(v.note||'')+'</td><td><b>'+fmt(v.montant)+'</b></td>'+(S.admin?'<td><button class="btn sm" data-del="versements/'+esc(k)+'" title="Supprimer">'+ic('trash')+'</button></td>':'')+'</tr>'}).join(''):'<tr><td colspan="6" class="empty">Aucun versement sur cette période.</td></tr>')+'</tbody></table></div></div></div>';
};
VIEWS.annulations=function(){
  var r=range(), ann=cmdsIn(r[0],r[1],function(c){return c.statut==='annulee'}), ret=[];
  Object.keys(S.commandes).forEach(function(k){var c=S.commandes[k];if(!match(c))return;(c.retours||[]).forEach(function(x){if(inR(x.date,r[0],r[1]))ret.push({c:c,x:x})})});
  return head('Annulations / Retours',esc(perLabel(r[0],r[1])),'undo',filtersHtml({noExport:1}))+perBar()+'<div class="stack">'+
  '<div class="card"><div class="hd"><h2>Commandes annulées ('+ann.length+')</h2></div><div class="tw"><table><thead><tr><th class="l">#</th><th class="l">Date</th><th class="l">Client</th><th class="l">Produit</th><th class="l">Motif</th><th>Montant</th><th>Remboursé</th><th class="l">Avoir</th></tr></thead><tbody>'+
  (ann.length?ann.map(function(k){var c=S.commandes[k],a=c.annulation||{};return '<tr><td class="l">'+esc(c.num)+'</td><td class="l">'+dfr(c.date)+'</td><td class="l">'+esc(c.client)+'</td><td class="l">'+esc(c.produit)+'</td><td class="l">'+esc(a.motif||'')+'</td><td>'+fmt(c.total)+'</td><td>'+fmt(a.rembourse)+'</td><td class="l">'+(a.avoir?'<span class="tag p">Avoir '+fmt(a.avoir)+'</span>':'')+'</td></tr>'}).join(''):'<tr><td colspan="8" class="empty">Aucune annulation.</td></tr>')+'</tbody></table></div></div>'+
  '<div class="card"><div class="hd"><h2>Retours produits ('+ret.length+')</h2></div><div class="tw"><table><thead><tr><th class="l">Date</th><th class="l">Commande</th><th class="l">Client</th><th class="l">Produit</th><th>Qté</th><th class="l">État</th><th>Montant</th><th>Remboursé</th></tr></thead><tbody>'+
  (ret.length?ret.map(function(o){return '<tr><td class="l">'+dfr(o.x.date)+'</td><td class="l">'+esc(o.c.num)+'</td><td class="l">'+esc(o.c.client)+'</td><td class="l">'+esc(o.c.produit)+'</td><td>'+o.x.qte+'</td><td class="l">'+(o.x.etat==='bon'?'<span class="tag g">Remis en stock</span>':'<span class="tag r">Endommagé</span>')+'</td><td>'+fmt(o.x.montant)+'</td><td>'+fmt(o.x.rembourse)+'</td></tr>'}).join(''):'<tr><td colspan="8" class="empty">Aucun retour.</td></tr>')+'</tbody></table></div></div></div>';
};
VIEWS.echanges=function(){
  var r=range(), l=[];
  Object.keys(S.commandes).forEach(function(k){var c=S.commandes[k];if(!match(c))return;(c.echanges||[]).forEach(function(x){if(inR(x.date,r[0],r[1]))l.push({c:c,x:x})})});
  return head('Échanges',esc(perLabel(r[0],r[1])),'swap',filtersHtml({noExport:1}))+perBar()+
  '<div class="card"><div class="tw"><table><thead><tr><th class="l">Date</th><th class="l">Commande</th><th class="l">Client</th><th class="l">Produit initial</th><th class="l">Nouveau produit</th><th>Qté</th><th>Complément</th></tr></thead><tbody>'+
  (l.length?l.map(function(o){return '<tr><td class="l">'+dfr(o.x.date)+'</td><td class="l">'+esc(o.c.num)+'</td><td class="l">'+esc(o.c.client)+'</td><td class="l">'+esc(o.x.ancien||o.c.produit)+'</td><td class="l">'+esc(o.x.produit)+'</td><td>'+o.x.qte+'</td><td>'+fmt(o.x.complement)+'</td></tr>'}).join(''):'<tr><td colspan="7" class="empty">Aucun échange sur cette période.</td></tr>')+'</tbody></table></div></div>';
};
VIEWS.produits=function(){
  var ps=pages(); if(!S.prodPage||!ps.some(function(p){return p.id===S.prodPage}))S.prodPage=S.fPage||(ps[0]&&ps[0].id)||'';
  var pid=S.prodPage, seuil=n(reg().seuil)||3;
  var l=Object.keys(S.produits).filter(function(k){return S.produits[k].pageId===pid&&!S.produits[k].archive}).sort(function(a,b){return S.produits[a].nom.localeCompare(S.produits[b].nom)});
  var mv=Object.keys(S.mouvements).filter(function(k){return S.mouvements[k].pageId===pid}).sort(function(a,b){var x=S.mouvements[a],y=S.mouvements[b];return ((y.date||'')+(y.le||'')).localeCompare((x.date||'')+(x.le||''))}).slice(0,40);
  var val=l.reduce(function(s,k){return s+Math.max(0,stockOf(k))*n(S.produits[k].achat)},0);
  return head('Produits & Stocks','Chaque page a son propre stock, sans mélange entre les pages','box',
   '<div class="filters"><label class="fld">Page Facebook<select data-ch="prodPage" data-fixed="1">'+optsPages(pid)+'</select></label></div>')+
  '<div class="stack"><div class="card"><div class="hd"><h2>Catalogue de '+esc(pName(pid))+'</h2><span class="sp"></span><span class="muted">Valeur du stock (prix d’achat) : <b>'+ar(val)+'</b></span></div><div class="tw"><table><thead><tr><th class="l">Produit</th><th class="l">Variantes</th><th>Prix de vente</th><th>Prix d’achat</th><th>Stock</th><th class="c">État</th>'+(S.admin?'<th class="c">Mouvement de stock</th>':'')+'</tr></thead><tbody>'+
  (l.length?l.map(function(k){var p=S.produits[k],s=stockOf(k),ps2=n(p.seuil)||seuil;return '<tr><td class="l"><b>'+esc(p.nom)+'</b></td><td class="l">'+esc(p.variantes||'')+'</td><td>'+fmt(p.prix)+'</td><td>'+fmt(p.achat)+'</td><td><b>'+s+'</b></td><td class="c">'+(s<=0?'<span class="tag r">Rupture</span>':s<=ps2?'<span class="tag o">Stock faible</span>':'<span class="tag g">OK</span>')+'</td>'+
    (S.admin?'<td class="c"><span style="display:inline-flex;gap:4px"><input class="in" style="width:70px;height:28px" type="number" id="mq_'+esc(k)+'" placeholder="Qté"><select class="in" style="height:28px" id="mt_'+esc(k)+'"><option value="entree">Entrée</option><option value="sortie">Sortie</option><option value="inventaire">Inventaire (stock réel)</option></select><button class="btn sm" data-mv="'+esc(k)+'">OK</button><button class="btn sm" data-editprod="'+esc(k)+'" title="Modifier">'+ic('edit')+'</button></span></td>':'')+'</tr>'}).join(''):'<tr><td colspan="7" class="empty">Aucun produit pour cette page.</td></tr>')+'</tbody></table></div></div>'+
  (S.admin?'<div class="card"><div class="hd"><h2>Ajouter un produit à '+esc(pName(pid))+'</h2></div><div class="bd"><div class="form" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">'+
   '<label class="lab">Nom<input id="npNom"></label><label class="lab">Variantes (taille, couleur…)<input id="npVar" placeholder="ex. 38, 39, 40"></label><label class="lab">Prix de vente<input id="npPrix" type="number" min="0"></label><label class="lab">Prix d’achat<input id="npAchat" type="number" min="0"></label><label class="lab">Stock initial<input id="npStock" type="number" min="0" value="0"></label><label class="lab">Alerte si stock ≤<input id="npSeuil" type="number" min="0" value="'+seuil+'"></label>'+
   '<label class="lab">&nbsp;<button class="btn g" data-act="addProd">'+ic('plus')+'Ajouter</button></label></div></div></div>':'')+
  '<div class="card"><div class="hd"><h2>Derniers mouvements de stock</h2></div><div class="tw"><table><thead><tr><th class="l">Date</th><th class="l">Produit</th><th class="l">Type</th><th>Quantité</th><th class="l">Note</th><th class="l">Par</th></tr></thead><tbody>'+
  (mv.length?mv.map(function(k){var m=S.mouvements[k];return '<tr><td class="l">'+dfr(m.date)+'</td><td class="l">'+esc((S.produits[m.produitId]||{}).nom||'')+'</td><td class="l">'+esc(m.type)+'</td><td class="'+(n(m.qte)<0?'cR':'cE')+'"><b>'+(n(m.qte)>0?'+':'')+m.qte+'</b></td><td class="l">'+esc(m.note||(m.commandeId&&S.commandes[m.commandeId]?S.commandes[m.commandeId].num:''))+'</td><td class="l">'+esc(m.par||'')+'</td></tr>'}).join(''):'<tr><td colspan="6" class="empty">Aucun mouvement.</td></tr>')+'</tbody></table></div></div>'+
  '<p class="muted">Les transferts entre pages ne sont jamais automatiques : fais une « Sortie » sur la page de départ et une « Entrée » sur la page d’arrivée, les deux restent dans l’historique.</p></div>';
};
VIEWS.clients=function(){
  var m={}, q=S.cmdQ.toLowerCase();
  Object.keys(S.commandes).forEach(function(k){var c=S.commandes[k];if(!match(c))return;var key=normTel(c.tel)||('n:'+String(c.client||'').toLowerCase().trim());var o=m[key]=m[key]||{nom:c.client,tel:c.tel,adresse:'',pages:{},nb:0,total:0,paye:0,reste:0,dernier:''};
    o.pages[c.pageId]=1;if(c.adresse)o.adresse=c.adresse;if(c.date>o.dernier){o.dernier=c.date;o.nom=c.client}if(c.statut==='annulee')return;o.nb++;o.total+=eff(c);o.paye+=paye(k);o.reste+=reste(c,k)});
  var l=Object.keys(m).map(function(k){return m[k]}).filter(function(o){return !q||(o.nom+' '+(o.tel||'')+' '+o.adresse).toLowerCase().indexOf(q)>=0}).sort(function(a,b){return b.total-a.total});
  return head('Clients',l.length+' clients · un client = un numéro de téléphone (pas de doublon)','user')+
  '<div class="card"><div class="hd"><input class="in" id="cliQ" data-ch="cmdQ" placeholder="Rechercher un client" value="'+esc(S.cmdQ)+'" style="flex:1" data-fixed="1"></div><div class="tw"><table><thead><tr><th class="l">Client</th><th class="l">Téléphone</th><th class="l">Adresse</th><th class="l">Pages</th><th>Commandes</th><th>Total acheté</th><th>Payé</th><th>Reste</th><th class="l">Dernier achat</th></tr></thead><tbody>'+
  (l.length?l.slice(0,500).map(function(o){return '<tr><td class="l"><b>'+esc(o.nom)+'</b></td><td class="l">'+esc(o.tel||'')+'</td><td class="l">'+esc(o.adresse)+'</td><td class="l">'+esc(Object.keys(o.pages).map(pName).join(', '))+'</td><td>'+o.nb+'</td><td>'+fmt(o.total)+'</td><td>'+fmt(o.paye)+'</td><td class="'+(o.reste?'cR':'')+'">'+fmt(o.reste)+'</td><td class="l">'+dfr(o.dernier)+'</td></tr>'}).join(''):'<tr><td colspan="9" class="empty">Aucun client.</td></tr>')+'</tbody></table></div></div>';
};
VIEWS.livraisons=function(){
  var r=range(), st=stats(r[0],r[1]);
  var l=cmdsIn(r[0],r[1],function(c){return c.statut!=='annulee'&&(!S.livSt||(c.livraison||'a_preparer')===S.livSt)});
  return head('Livraisons','Suivi des commandes à livrer','truck',filtersHtml({noExport:1}))+perBar()+
  '<div class="chips" style="margin-bottom:10px"><button class="btn sm'+(S.livSt===''?' b':'')+'" data-livst="">Toutes</button>'+Object.keys(LIV).map(function(k){return '<button class="btn sm'+(S.livSt===k?' b':'')+'" data-livst="'+k+'">'+LIV[k]+' · '+(st.liv[k]||0)+'</button>'}).join('')+'</div>'+
  '<div class="card"><div class="tw"><table><thead><tr><th class="l">#</th><th class="l">Date</th><th class="l">Client</th><th class="l">Téléphone</th><th class="l">Adresse</th><th class="l">Produit</th><th>À encaisser</th><th class="l">Livreur</th><th class="c">Statut</th></tr></thead><tbody>'+
  (l.length?l.map(function(k){var c=S.commandes[k];return '<tr><td class="l">'+esc(c.num)+'</td><td class="l">'+dfr(c.date)+'</td><td class="l">'+esc(c.client)+'</td><td class="l">'+esc(c.tel||'')+'</td><td class="l">'+esc(c.adresse||'')+'</td><td class="l">'+esc(c.produit)+' × '+(n(c.qte)-retQte(c))+'</td><td class="'+(reste(c,k)?'cR':'')+'">'+fmt(reste(c,k))+'</td><td class="l"><input class="in" style="height:28px;width:120px" data-livreur="'+esc(k)+'" value="'+esc(c.livreur||'')+'" placeholder="Nom" data-fixed="1"></td><td class="c"><select class="in" style="height:28px" data-liv="'+esc(k)+'" data-fixed="1">'+Object.keys(LIV).map(function(x){return '<option value="'+x+'"'+((c.livraison||'a_preparer')===x?' selected':'')+'>'+LIV[x]+'</option>'}).join('')+'</select></td></tr>'}).join(''):'<tr><td colspan="9" class="empty">Aucune livraison.</td></tr>')+'</tbody></table></div></div>';
};
VIEWS.pagesfb=function(){
  var r=range(), ps=pages(), rows=ps.map(function(p){var st=stats(r[0],r[1],{match:function(o){return o.pageId===p.id&&(!S.fVend||o.vendeurId===S.fVend)}});return {p:p,st:st}}).sort(function(a,b){return b.st.ventes-a.st.ventes});
  return head('Pages Facebook','Résultats par page et classement · les pages viennent de Compte Boost','fb',filtersHtml({noExport:1}))+perBar()+
  '<div class="card"><div class="tw"><table><thead><tr><th class="c">Rang</th><th class="l">Page</th><th class="l">Responsable</th><th>Commandes</th><th>Annulées</th><th>Ventes confirmées</th><th>Encaissé</th><th>Reste</th><th>Bénéfice brut</th><th class="c">Réponse auto IA</th>'+(S.admin?'<th>Frais livraison</th>':'')+'</tr></thead><tbody>'+
  (rows.length?rows.map(function(o,i){var g=S.gsPages[o.p.id]||{};return '<tr><td class="c"><b>'+(i+1)+'</b></td><td class="l"><b>'+esc(o.p.nom)+'</b></td><td class="l">'+esc(vName(o.p.resp))+'</td><td>'+o.st.nbConf+'</td><td>'+o.st.nbAnn+'</td><td><b>'+fmt(o.st.ventes)+'</b></td><td>'+fmt(o.st.enc)+'</td><td class="'+(o.st.reste?'cR':'')+'">'+fmt(o.st.reste)+'</td><td>'+fmt(o.st.ventes-o.st.cogs)+'</td>'+
   '<td class="c">'+(S.admin?'<label class="chk" style="justify-content:center"><input type="checkbox" data-ia="'+esc(o.p.id)+'"'+(g.autoIA?' checked':'')+' data-fixed="1">'+(g.autoIA?'Activée':'Désactivée')+'</label>':(g.autoIA?'Activée':'Désactivée'))+'</td>'+
   (S.admin?'<td><input class="in" style="width:90px;height:28px" type="number" min="0" data-frais="'+esc(o.p.id)+'" value="'+n(g.fraisLivraison)+'" data-fixed="1"></td>':'')+'</tr>'}).join(''):'<tr><td colspan="11" class="empty">Aucune page. Ajoute tes pages dans Compte Boost.</td></tr>')+'</tbody></table></div></div>'+
  '<p class="muted">Pour ajouter ou retirer une page et choisir son responsable, utilise l’onglet « Pages et équipe » de <a href="../">Compte Boost</a> : Gestock les reprend automatiquement.</p>';
};
VIEWS.ia=function(){
  var ps=pages();
  return head('Messagerie IA','Réponses automatiques Messenger en français et en malagasy','chat')+
  '<div class="stack"><div class="card"><div class="hd"><h2>Bientôt disponible</h2><span class="tag a">En préparation</span></div><div class="bd">'+
  '<p style="margin-top:0">L’assistant répondra aux clients de chaque page, vérifiera le stock de <b>cette page</b>, préparera un récapitulatif et demandera la confirmation du client avant d’enregistrer la commande ici. Une demande de prix ne deviendra jamais une commande sans confirmation.</p>'+
  '<p><b>Ce qu’il faut pour l’activer :</b></p><ol class="steps">'+
  '<li>Une application Meta (developers.facebook.com) reliée à tes pages, avec la permission <code>pages_messaging</code> validée par Meta.</li>'+
  '<li>Un petit serveur qui reçoit les messages (webhook), par exemple un Worker Cloudflare gratuit, où les clés restent secrètes.</li>'+
  '<li>Une clé d’API pour l’IA.</li>'+
  '<li>Règle de Meta : l’assistant peut répondre librement pendant 24 h après le dernier message du client ; après, seuls certains messages sont permis.</li></ol>'+
  '<p class="muted">Tu peux déjà choisir dans « Pages Facebook » les pages où la réponse automatique sera activée.</p></div></div>'+
  '<div class="card"><div class="hd"><h2>État par page</h2></div><div class="tw"><table><thead><tr><th class="l">Page</th><th class="c">Réponse auto</th><th class="c">Connexion Meta</th></tr></thead><tbody>'+
  ps.map(function(p){var g=S.gsPages[p.id]||{};return '<tr><td class="l">'+esc(p.nom)+'</td><td class="c">'+(g.autoIA?'<span class="tag g">Prévue</span>':'<span class="tag n">Non</span>')+'</td><td class="c"><span class="tag n">Pas encore reliée</span></td></tr>'}).join('')+'</tbody></table></div></div></div>';
};
function benef(a,b){
  var ps=pages(), st=stats(a,b), dep=0, rep=reg().repartition||'egal';
  var caPage={}, caTot=0;
  if(rep==='ca'){ps.forEach(function(p){var s=stats(a,b,{match:function(o){return o.pageId===p.id}});caPage[p.id]=s.ventes;caTot+=s.ventes})}
  Object.keys(S.depenses).forEach(function(k){var d=S.depenses[k];if(!inR(d.date,a,b))return;
    if(S.fPage){if(d.pageId===S.fPage)dep+=n(d.montant);else if(!d.pageId){dep+=n(d.montant)*(rep==='ca'?(caTot?caPage[S.fPage]/caTot:0):(ps.length?1/ps.length:0))}}
    else dep+=n(d.montant)});
  return {ca:st.ventes,realise:st.realise,cogs:st.cogs,brut:st.ventes-st.cogs,dep:dep,net:st.ventes-st.cogs-dep,enc:st.enc,creances:st.reste};
}
VIEWS.depenses=function(){
  var r=range(), b=benef(r[0],r[1]);
  var l=Object.keys(S.depenses).filter(function(k){var d=S.depenses[k];return inR(d.date,r[0],r[1])&&(!S.fPage||d.pageId===S.fPage||!d.pageId)}).sort(function(x,y){return S.depenses[y].date.localeCompare(S.depenses[x].date)});
  function line(l2,v,cls){return '<div class="row"><span>'+l2+'</span><b class="'+(cls||'')+'">'+ar(v)+'</b></div>'}
  return head('Dépenses & bénéfices',esc(perLabel(r[0],r[1])),'dep',filtersHtml({noExport:1}))+perBar()+
  '<div class="grid2"><div class="stack"><div class="card"><div class="hd"><h2>Nouvelle dépense</h2></div><div class="bd"><div class="form" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">'+
  '<label class="lab">Date<input id="ndDate" type="date" value="'+today()+'"></label><label class="lab">Catégorie<select id="ndCat">'+DEPCAT.map(function(c){return '<option>'+c+'</option>'}).join('')+'</select></label>'+
  '<label class="lab">Montant<input id="ndM" type="number" min="0"></label><label class="lab">Page<select id="ndPage"><option value="">Commune à toutes les pages</option>'+optsPages(S.fPage)+'</select></label><label class="lab">Note<input id="ndNote"></label>'+
  '<label class="lab">&nbsp;<button class="btn g" data-act="addDep">'+ic('plus')+'Ajouter</button></label></div></div></div>'+
  '<div class="card"><div class="hd"><h2>Dépenses de la période</h2></div><div class="tw"><table><thead><tr><th class="l">Date</th><th class="l">Catégorie</th><th class="l">Page</th><th class="l">Note</th><th>Montant</th><th></th></tr></thead><tbody>'+
  (l.length?l.map(function(k){var d=S.depenses[k];return '<tr><td class="l">'+dfr(d.date)+'</td><td class="l">'+esc(d.categorie)+'</td><td class="l">'+(d.pageId?esc(pName(d.pageId)):'<span class="tag n">Commune</span>')+'</td><td class="l">'+esc(d.note||'')+'</td><td><b>'+fmt(d.montant)+'</b></td><td><button class="btn sm" data-del="depenses/'+esc(k)+'">'+ic('trash')+'</button></td></tr>'}).join(''):'<tr><td colspan="6" class="empty">Aucune dépense.</td></tr>')+'</tbody></table></div></div></div>'+
  '<div class="card syn"><div class="hd"><h2>Bénéfices'+(S.fPage?' · '+esc(pName(S.fPage)):'')+'</h2></div><div class="bd">'+
  line('Chiffre d’affaires (ventes confirmées)',b.ca)+line('Ventes réalisées (livrées)',b.realise)+line('Coût des produits vendus',-b.cogs)+line('<b>Bénéfice brut</b>',b.brut,'cE')+line('Dépenses',-b.dep,'cR')+line('<b>Bénéfice net</b>',b.net,b.net<0?'cR':'cE')+line('Encaissements',b.enc)+line('Créances (reste à encaisser)',b.creances,'cR')+
  (S.fPage?'<p class="muted" style="font-size:11px">Dépenses communes réparties '+((reg().repartition||'egal')==='ca'?'selon le chiffre d’affaires':'à parts égales')+' entre les pages (Paramètres).</p>':'')+'</div></div></div>';
};
VIEWS.employes=function(){
  var r=range(), vs=vendeurs();
  return head('Employés','Comptes et accès gérés dans Compte Boost · résultats de la période','users',filtersHtml({noExport:1}))+perBar()+
  '<div class="card"><div class="tw"><table><thead><tr><th class="l">Employé</th><th class="l">Pages attribuées</th><th>Commandes confirmées</th><th>Ventes</th><th>Encaissé</th><th>Versé</th><th>Écart</th></tr></thead><tbody>'+
  vs.map(function(v,i){var mt=function(o){return o.vendeurId===v.id&&allowedPage(o.pageId)};var st=stats(r[0],r[1],{match:mt});var verse=Object.keys(S.versements).reduce(function(s,k){var x=S.versements[k];return s+(x.vendeurId===v.id&&inR(x.date,r[0],r[1])?n(x.montant):0)},0);
    var pg=Object.keys(S.pages).filter(function(k){return S.pages[k].responsable===v.id&&!S.pages[k].archivee}).map(pName);
    return '<tr><td class="l"><span class="who">'+avatar(v.nom,i)+esc(v.nom)+'</span></td><td class="l">'+esc(pg.join(', ')||'—')+'</td><td>'+st.nbConf+'</td><td>'+fmt(st.ventes)+'</td><td>'+fmt(st.enc)+'</td><td>'+fmt(verse)+'</td><td class="'+(verse-st.enc<0?'cR':'')+'">'+fmt(verse-st.enc)+'</td></tr>'}).join('')+'</tbody></table></div></div>'+
  '<p class="muted">Pour créer un accès employé, changer un mot de passe ou attribuer une page, utilise <a href="../">Compte Boost</a>. Le suivi des messages traités et du temps de réponse arrivera avec la Messagerie IA.</p>';
};
function barsSvg(points){
  var W=760,H=220,pl=56,pb=26,pt=10, mx=1;points.forEach(function(p){mx=Math.max(mx,p.a,p.b)});
  var bw=Math.min(90,(W-pl-10)/points.length), x0=pl+((W-pl-10)-bw*points.length)/2, s='<svg class="bars" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Évolution des ventes et des encaissements">';
  for(var g=0;g<=4;g++){var y=pt+(H-pt-pb)*(1-g/4);s+='<line x1="'+pl+'" x2="'+W+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="10" fill="var(--muted)">'+(mx*g/4>=1e6?(mx*g/4/1e6).toFixed(1)+'M':Math.round(mx*g/4/1000)+'k')+'</text>'}
  points.forEach(function(p,i){var x=x0+i*bw, w=Math.max(2,bw/2-3), ha=(H-pt-pb)*p.a/mx, hb=(H-pt-pb)*p.b/mx;
    s+='<rect x="'+(x+2)+'" y="'+(H-pb-ha)+'" width="'+w+'" height="'+ha+'" rx="2" fill="#2563eb"><title>'+esc(p.l)+' · ventes '+fmt(p.a)+' Ar</title></rect><rect x="'+(x+2+w+1)+'" y="'+(H-pb-hb)+'" width="'+w+'" height="'+hb+'" rx="2" fill="#16a34a"><title>'+esc(p.l)+' · encaissé '+fmt(p.b)+' Ar</title></rect>';
    if(points.length<=16||i%Math.ceil(points.length/12)===0)s+='<text x="'+(x+bw/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="var(--muted)">'+esc(p.l)+'</text>'});
  return s+'</svg>';
}
VIEWS.rapports=function(){
  var r=range(), days=Math.round((pd(r[1])-pd(r[0]))/864e5)+1, pts=[];
  if(days<=62){for(var i=0;i<days;i++){var d=addD(r[0],i),st=stats(d,d);pts.push({l:dfr(d).slice(0,5),a:st.ventes,b:st.enc})}}
  else{var d0=pd(r[0]);for(var m=new Date(d0.getFullYear(),d0.getMonth(),1);ymd(m)<=r[1];m=new Date(m.getFullYear(),m.getMonth()+1,1)){var a=ymd(m),b=ymd(new Date(m.getFullYear(),m.getMonth()+1,0)),s2=stats(a<r[0]?r[0]:a,b>r[1]?r[1]:b);pts.push({l:MO[m.getMonth()],a:s2.ventes,b:s2.enc})}}
  var prod={};Object.keys(S.commandes).forEach(function(k){var c=S.commandes[k];if(!inR(c.date,r[0],r[1])||!match(c)||c.statut==='annulee')return;var o=prod[c.produitId]=prod[c.produitId]||{nom:c.produit,page:c.pageId,q:0,ca:0,co:0};o.q+=n(c.qte)-retQte(c);o.ca+=eff(c);o.co+=cost(c)});
  var pl=Object.keys(prod).map(function(k){return prod[k]}).sort(function(a,b){return b.ca-a.ca});
  var st=stats(r[0],r[1]), pr=prevRange(r[0],r[1]), pv=stats(pr[0],pr[1]), b2=benef(r[0],r[1]);
  function cmp(l,a,b){return '<tr><td class="l">'+l+'</td><td>'+fmt(a)+'</td><td>'+fmt(b)+'</td><td>'+(b?delta(a,b).replace(' vs période préc.',''):'—')+'</td></tr>'}
  return head('Rapports',esc(perLabel(r[0],r[1])),'chart',filtersHtml())+perBar()+'<div class="stack">'+
  '<div class="card"><div class="hd"><h2>Évolution des ventes</h2><span class="sp"></span><div class="legend"><span><i style="background:#2563eb"></i>Ventes confirmées</span><span><i style="background:#16a34a"></i>Encaissé</span></div></div><div class="bd">'+barsSvg(pts)+'</div></div>'+
  '<div class="grid2" style="grid-template-columns:1fr 1fr"><div class="card"><div class="hd"><h2>Comparaison avec la période précédente</h2></div><div class="tw"><table><thead><tr><th class="l">Indicateur</th><th>Cette période</th><th>Précédente</th><th>Évolution</th></tr></thead><tbody>'+
   cmp('Commandes reçues',st.nb,pv.nb)+cmp('Commandes confirmées',st.nbConf,pv.nbConf)+cmp('Commandes annulées',st.nbAnn,pv.nbAnn)+cmp('Ventes confirmées',st.ventes,pv.ventes)+cmp('Ventes réalisées (livrées)',st.realise,pv.realise)+cmp('Paiements encaissés',st.enc,pv.enc)+cmp('Reste à encaisser',st.reste,pv.reste)+'</tbody></table></div></div>'+
  '<div class="card"><div class="hd"><h2>Bénéfice</h2></div><div class="tw"><table><tbody>'+[['Chiffre d’affaires',b2.ca],['Coût des produits vendus',-b2.cogs],['Bénéfice brut',b2.brut],['Dépenses',-b2.dep],['Bénéfice net',b2.net],['Encaissé',b2.enc],['Créances',b2.creances]].map(function(x){return '<tr><td class="l">'+x[0]+'</td><td class="'+(x[1]<0?'cR':'')+'"><b>'+fmt(x[1])+'</b></td></tr>'}).join('')+
   '<tr><td class="l">Livraisons</td><td>'+Object.keys(LIV).filter(function(k){return st.liv[k]}).map(function(k){return LIV[k]+' '+st.liv[k]}).join(' · ')+'</td></tr></tbody></table></div></div></div>'+
  '<div class="card"><div class="hd"><h2>Par produit</h2></div><div class="tw"><table><thead><tr><th class="l">Produit</th><th class="l">Page</th><th>Quantité</th><th>Ventes</th><th>Coût</th><th>Marge</th></tr></thead><tbody>'+
  (pl.length?pl.map(function(o){return '<tr><td class="l">'+esc(o.nom)+'</td><td class="l">'+esc(pName(o.page))+'</td><td>'+o.q+'</td><td>'+fmt(o.ca)+'</td><td>'+fmt(o.co)+'</td><td><b>'+fmt(o.ca-o.co)+'</b></td></tr>'}).join(''):'<tr><td colspan="6" class="empty">Aucune vente.</td></tr>')+'</tbody></table></div></div>'+
  '<div class="chips no-print"><button class="btn b" data-act="export">'+ic('down')+'Export Excel</button><button class="btn" data-act="print">Imprimer / PDF</button></div></div>';
};
VIEWS.historique=function(){
  var l=Object.keys(S.journal).sort(function(a,b){return (S.journal[b].le||'').localeCompare(S.journal[a].le||'')}).slice(0,400);
  return head('Historique','Journal des actions enregistrées dans Gestock','clock')+
  '<div class="card"><div class="tw"><table><thead><tr><th class="l">Date et heure</th><th class="l">Par</th><th class="l">Action</th><th class="l">Détail</th></tr></thead><tbody>'+
  (l.length?l.map(function(k){var j=S.journal[k],d=new Date(j.le);return '<tr><td class="l">'+dfr(ymd(d))+' '+pad(d.getHours())+':'+pad(d.getMinutes())+'</td><td class="l">'+esc(j.par)+'</td><td class="l"><b>'+esc(j.action)+'</b></td><td class="l" style="white-space:normal">'+esc(j.detail)+'</td></tr>'}).join(''):'<tr><td colspan="4" class="empty">Aucune action pour le moment.</td></tr>')+'</tbody></table></div></div>';
};
VIEWS.parametres=function(){
  var g=reg();
  return head('Paramètres','Réglages de Gestock','gear')+
  '<div class="card" style="max-width:640px"><div class="bd"><div class="form">'+
  '<label class="lab">Alerte de stock faible (quantité par défaut)<input id="rgSeuil" type="number" min="0" value="'+(g.seuil!=null?g.seuil:3)+'" data-fixed="1"></label>'+
  '<label class="lab">Répartition des dépenses communes entre les pages<select id="rgRep" data-fixed="1"><option value="egal"'+(g.repartition!=='ca'?' selected':'')+'>À parts égales</option><option value="ca"'+(g.repartition==='ca'?' selected':'')+'>Selon le chiffre d’affaires de chaque page</option></select></label>'+
  '<label class="lab">Autres moyens de paiement (séparés par des virgules)<input id="rgModes" value="'+esc((g.modes||[]).join(', '))+'" placeholder="ex. Airtel Money, Virement" data-fixed="1"></label>'+
  '<button class="btn g" data-act="saveReg">'+ic('check')+'Enregistrer</button>'+
  '<p class="muted">Les comptes, mots de passe et pages se gèrent dans <a href="../">Compte Boost</a>. Les données de Gestock sont dans la même base, à part, et ne modifient jamais celles de Compte Boost.</p></div></div></div>';
};

/* ---------- Calculs en direct dans les formulaires ---------- */
function val(id){var e=document.getElementById(id);return e?e.value:''}
function setv(id,v){var e=document.getElementById(id);if(e)e.value=v}
function settx(id,t){var e=document.getElementById(id);if(e)e.textContent=t}
function recalc(){
  if(document.getElementById('fcTot')){
    var tot=n(val('fcPu'))*n(val('fcQte'))+n(val('fcLiv'));
    settx('fcTot',ar(tot));settx('fcReste',ar(Math.max(0,tot-n(val('fcM1'))-n(val('fcM2')))));
  }
  var c=S.commandes[val('feCmd')], p=S.produits[val('feProd')];
  if(document.getElementById('feC'))setv('feC',c&&p?fmt(n(p.prix)*n(val('feQ'))-n(c.pu)*n(val('feQ'))):'');
}
function onRe(el){
  var k=el.dataset.re;
  if(k==='1'){var pid=el.value;var sel=document.getElementById('fcProd');if(sel)sel.innerHTML=optsProduits(pid,'',true);var v=document.getElementById('fcVend'),resp=(S.pages[pid]||{}).responsable;if(v&&resp&&[].some.call(v.options,function(o){return o.value===resp}))v.value=resp;setv('fcLiv',n((S.gsPages[pid]||{}).fraisLivraison));setv('fcPu','')}
  if(k==='pu'){var p=S.produits[el.value];if(p)setv('fcPu',n(p.prix))}
  if(k==='fp'){var px=el.id.replace('Cmd',''),c=S.commandes[el.value];if(c)setv(px+'M',reste(c,el.value))}
  if(k==='fa'){var ca=S.commandes[el.value];if(ca)setv('faM',paye(el.value))}
  if(k==='fr'){var cr=S.commandes[el.value];if(cr){setv('frQ',1);setv('frM',Math.max(0,Math.min(n(cr.pu),paye(el.value)-Math.max(0,eff(cr)-n(cr.pu)))))}}
  if(k==='fe'&&el.id==='feCmd'){var ce=S.commandes[el.value],s=document.getElementById('feProd');if(s)s.innerHTML=ce?optsProduits(ce.pageId,'',true):'<option value="">— Choisir la commande —</option>'}
  recalc();
}

/* ---------- Actions ---------- */
function msg(id,t,ok){var e=document.getElementById(id);if(e){e.textContent=t;e.className='msg '+(ok?'ok':'ko')}}
var busy=false;
function guard(fn){if(busy)return;busy=true;Promise.resolve().then(fn).catch(function(e){console.error(e)}).then(function(){busy=false})}
function saveCmd(){
  var pid=val('fcPage'), prid=val('fcProd'), p=S.produits[prid], q=n(val('fcQte')), pu=n(val('fcPu')), liv=n(val('fcLiv')), cl=val('fcClient').trim(), tel=val('fcTel').trim();
  if(!pid)return msg('fcMsg','Choisis la page Facebook.');
  if(!cl)return msg('fcMsg','Écris le nom du client.');
  if(!p||p.pageId!==pid)return msg('fcMsg','Choisis un produit de cette page.');
  if(q<1||Math.floor(q)!==q)return msg('fcMsg','La quantité doit être un nombre entier.');
  var s=stockOf(prid);if(s<q)return msg('fcMsg','Stock insuffisant : il reste '+s+' « '+p.nom+' » sur cette page.');
  var tot=pu*q+liv, m1=n(val('fcM1')), m2=n(val('fcM2'));
  if(m1<0||m2<0)return msg('fcMsg','Montant de paiement invalide.');
  if(m1+m2>tot)return msg('fcMsg','Les paiements dépassent le total de la commande.');
  if(!tel){var t2=clientList().filter(function(c){return c.nom.toLowerCase()===cl.toLowerCase()})[0];if(t2)tel=t2.tel||''}
  var id=rid(), num=nextNum(), vend=val('fcVend')||(S.admin?'admin':'inv_'+S.myCode);
  var c={num:num,date:today(),le:nowIso(),pageId:pid,vendeurId:vend,client:cl,tel:tel,adresse:val('fcAdr').trim(),produitId:prid,produit:p.nom,pu:pu,qte:q,fraisLivraison:liv,total:tot,statut:'confirmee',livraison:'a_preparer',par:S.meName||''};
  return guard(function(){
    return col('commandes').doc(id).set(c)
      .then(function(){return mvt({produitId:prid,pageId:pid,qte:-q,type:'vente',commandeId:id})})
      .then(function(){var w=[];
        if(m1>0)w.push(col('paiements').doc(rid()).set({commandeId:id,date:val('fcD1')||today(),montant:m1,mode:val('fcO1'),type:'paiement',pageId:pid,vendeurId:vend,le:nowIso(),par:S.meName||''}));
        if(m2>0)w.push(col('paiements').doc(rid()).set({commandeId:id,date:val('fcD2')||today(),montant:m2,mode:val('fcO2'),type:'paiement',pageId:pid,vendeurId:vend,le:new Date(Date.now()+1).toISOString(),par:S.meName||''}));
        return Promise.all(w)})
      .then(function(){journal('Commande '+num,cl+' · '+p.nom+' × '+q+' · '+ar(tot)+' · '+pName(pid));['fcClient','fcTel','fcAdr','fcM1','fcM2'].forEach(function(k){setv(k,'')});setv('fcQte',1);recalc();msg('fcMsg','Commande '+num+' enregistrée.',true);toast('Commande '+num+' enregistrée')},fail);
  });
}
function savePay(px){
  var cid=val(px+'Cmd'), c=S.commandes[cid], m=n(val(px+'M'));
  if(!c)return msg(px+'Msg','Choisis la commande.');
  var r=reste(c,cid);if(m<=0)return msg(px+'Msg','Écris le montant.');if(m>r)return msg(px+'Msg','Le montant dépasse le reste à payer ('+ar(r)+').');
  return guard(function(){return col('paiements').doc(rid()).set({commandeId:cid,date:val(px+'D')||today(),montant:m,mode:val(px+'O'),type:'paiement',pageId:c.pageId,vendeurId:c.vendeurId,le:nowIso(),par:S.meName||''})
    .then(function(){journal('Paiement '+c.num,ar(m)+' · '+modeName(val(px+'O')));setv(px+'M','');msg(px+'Msg','Paiement enregistré.',true);toast('Paiement enregistré')},fail)});
}
function annuler(){
  var cid=val('faCmd'), c=S.commandes[cid];if(!c)return msg('faMsg','Choisis la commande.');
  var pp=paye(cid), rb=document.getElementById('faRemb').checked?n(val('faM')):0, av=document.getElementById('faAvoir').checked?Math.max(0,pp-rb):0;
  if(rb>pp)return msg('faMsg','Le remboursement dépasse ce que le client a payé ('+ar(pp)+').');
  if(!confirm('Annuler la commande '+c.num+' de '+c.client+' ?'))return;
  var back=n(c.qte)-retQte(c);
  return guard(function(){
    var ex=(c.echanges||[]);
    var w=[col('commandes').doc(cid).update({statut:'annulee',annulation:{motif:val('faMotif'),le:nowIso(),date:today(),rembourse:rb,avoir:av,par:S.meName||''}})];
    /* remise en stock du produit actuellement chez le client */
    var cur=ex.length?ex[ex.length-1]:null;
    if(cur){w.push(mvt({produitId:cur.produitId,pageId:c.pageId,qte:n(cur.qte),type:'annulation',commandeId:cid}));if(back-n(cur.qte)>0)w.push(mvt({produitId:c.produitId,pageId:c.pageId,qte:back-n(cur.qte),type:'annulation',commandeId:cid}))}
    else if(back>0)w.push(mvt({produitId:c.produitId,pageId:c.pageId,qte:back,type:'annulation',commandeId:cid}));
    if(rb>0)w.push(col('paiements').doc(rid()).set({commandeId:cid,date:today(),montant:-rb,mode:val('faO'),type:'remboursement',pageId:c.pageId,vendeurId:c.vendeurId,le:nowIso(),par:S.meName||''}));
    return Promise.all(w).then(function(){journal('Annulation '+c.num,val('faMotif')+(rb?' · remboursé '+ar(rb):'')+(av?' · avoir '+ar(av):''));msg('faMsg','Commande annulée.',true);toast('Commande '+c.num+' annulée')},fail);
  });
}
function retour(){
  var cid=val('frCmd'), c=S.commandes[cid];if(!c)return msg('frMsg','Choisis la commande.');
  var q=n(val('frQ')), max=n(c.qte)-retQte(c);if(q<1||q>max)return msg('frMsg','Quantité entre 1 et '+max+'.');
  var mont=n(c.pu)*q, rb=n(val('frM')), etat=val('frEtat');
  var newEff=Math.max(0,eff(c)-mont), pp=paye(cid);if(rb>Math.max(0,pp-newEff))return msg('frMsg','Remboursement maximum : '+ar(Math.max(0,pp-newEff))+'.');
  var rets=(c.retours||[]).concat([{date:today(),le:nowIso(),qte:q,montant:mont,etat:etat,rembourse:rb,par:S.meName||''}]);
  return guard(function(){
    var w=[col('commandes').doc(cid).update({retours:rets})];
    if(etat==='bon')w.push(mvt({produitId:c.produitId,pageId:c.pageId,qte:q,type:'retour',commandeId:cid}));
    if(rb>0)w.push(col('paiements').doc(rid()).set({commandeId:cid,date:today(),montant:-rb,mode:val('frO'),type:'remboursement',pageId:c.pageId,vendeurId:c.vendeurId,le:nowIso(),par:S.meName||''}));
    return Promise.all(w).then(function(){journal('Retour '+c.num,q+' × '+c.produit+' · '+(etat==='bon'?'remis en stock':'endommagé')+(rb?' · remboursé '+ar(rb):''));msg('frMsg','Retour enregistré.',true);toast('Retour enregistré')},fail);
  });
}
function echange(){
  var cid=val('feCmd'), c=S.commandes[cid], np=S.produits[val('feProd')];
  if(!c)return msg('feMsg','Choisis la commande.');if(!np||np.pageId!==c.pageId)return msg('feMsg','Choisis le nouveau produit (même page).');
  var q=n(val('feQ')), max=n(c.qte)-retQte(c);if(q<1||q>max)return msg('feMsg','Quantité entre 1 et '+max+'.');
  var prev=(c.echanges||[]).length?c.echanges[c.echanges.length-1]:null, oldId=prev?prev.produitId:c.produitId, oldNom=prev?prev.produit:c.produit, oldPu=prev?n(prev.pu):n(c.pu);
  if(oldId===val('feProd'))return msg('feMsg','Choisis un produit différent.');
  if(stockOf(val('feProd'))<q)return msg('feMsg','Stock insuffisant pour « '+np.nom+' ».');
  var comp=(n(np.prix)-oldPu)*q, m=n(val('feM'));
  if(m<0||m>Math.max(0,comp)+reste(c,cid))return msg('feMsg','Montant payé trop élevé.');
  var ex=(c.echanges||[]).concat([{date:today(),le:nowIso(),ancienId:oldId,ancien:oldNom,produitId:val('feProd'),produit:np.nom,pu:n(np.prix),qte:q,complement:comp,par:S.meName||''}]);
  return guard(function(){
    var w=[col('commandes').doc(cid).update({echanges:ex}),mvt({produitId:oldId,pageId:c.pageId,qte:q,type:'echange',commandeId:cid,note:'Rendu par le client'}),mvt({produitId:val('feProd'),pageId:c.pageId,qte:-q,type:'echange',commandeId:cid,note:'Donné en échange'})];
    if(m>0)w.push(col('paiements').doc(rid()).set({commandeId:cid,date:today(),montant:m,mode:val('feO'),type:'paiement',pageId:c.pageId,vendeurId:c.vendeurId,le:nowIso(),par:S.meName||''}));
    return Promise.all(w).then(function(){journal('Échange '+c.num,oldNom+' → '+np.nom+' × '+q+' · complément '+ar(comp));msg('feMsg','Échange enregistré.',true);toast('Échange enregistré')},fail);
  });
}
function dialogVers(vid){
  var d=document.getElementById('dlg'), r=range(), rows=vendorRows(r[0],r[1]), row=rows.filter(function(x){return x.v===vid})[0];
  var due=row?Math.max(0,-row.ecart):0;
  d.innerHTML='<div class="card" style="border:0"><div class="hd green"><h2>Versement au gérant</h2></div><div class="bd form">'+
   '<label class="lab">Vendeur<select id="dvV" data-fixed="1">'+vendeurs().map(function(v){return '<option value="'+esc(v.id)+'"'+(v.id===vid?' selected':'')+'>'+esc(v.nom)+'</option>'}).join('')+'</select></label>'+
   '<div class="f2"><label class="lab">Date<input id="dvD" type="date" value="'+(r[1]<today()?r[1]:today())+'" data-fixed="1"></label><label class="lab">Montant versé<input id="dvM" type="number" min="0" value="'+(due||'')+'" data-fixed="1"></label></div>'+
   '<label class="lab">Mode<select id="dvO" data-fixed="1">'+optsModes('especes')+'</select></label><label class="lab">Note<input id="dvN" data-fixed="1"></label>'+
   (row?'<div class="note">À reverser sur la période : '+ar(row.aRev)+' · déjà versé : '+ar(row.verse)+'</div>':'')+
   '<div class="msg" id="dvMsg"></div><div class="f2"><button class="btn" data-act="closeDlg">Fermer</button><button class="btn g" data-act="saveVers">Enregistrer</button></div></div></div>';
  if(d.showModal)d.showModal();else d.setAttribute('open','');
}
function saveVers(){
  var v=val('dvV'), m=n(val('dvM'));if(!v)return msg('dvMsg','Choisis le vendeur.');if(m<=0)return msg('dvMsg','Écris le montant.');
  return guard(function(){return col('versements').doc(rid()).set({date:val('dvD')||today(),vendeurId:v,montant:m,mode:val('dvO'),note:val('dvN'),le:nowIso(),par:S.meName||''})
    .then(function(){journal('Versement',vName(v)+' · '+ar(m));closeDlg();toast('Versement enregistré')},fail)});
}
function closeDlg(){var d=document.getElementById('dlg');if(d){if(d.close)d.close();else d.removeAttribute('open')}}
function addProd(){
  var nom=val('npNom').trim();if(!nom)return toast('Écris le nom du produit',true);
  var id=rid(), st=n(val('npStock')), pid=S.prodPage;
  return guard(function(){return col('produits').doc(id).set({pageId:pid,nom:nom,variantes:val('npVar').trim(),prix:n(val('npPrix')),achat:n(val('npAchat')),seuil:n(val('npSeuil')),cree:nowIso()})
    .then(function(){return st>0?mvt({produitId:id,pageId:pid,qte:st,type:'entree',note:'Stock initial'}):null})
    .then(function(){journal('Produit ajouté',nom+' · '+pName(pid)+' · stock '+st);['npNom','npVar','npPrix','npAchat'].forEach(function(k){setv(k,'')});setv('npStock',0);toast('Produit ajouté')},fail)});
}
function editProd(k){
  var p=S.produits[k];if(!p)return;
  var prix=prompt('Prix de vente de « '+p.nom+' »',p.prix);if(prix==null)return;
  var achat=prompt('Prix d’achat',p.achat);if(achat==null)return;
  var vari=prompt('Variantes',p.variantes||'');if(vari==null)return;
  guard(function(){return col('produits').doc(k).update({prix:n(prix),achat:n(achat),variantes:vari}).then(function(){journal('Produit modifié',p.nom+' · prix '+ar(prix));toast('Produit modifié')},fail)});
}
function moveStock(k){
  var p=S.produits[k], q=n(val('mq_'+k)), t=val('mt_'+k);if(!p)return;
  var cur=stockOf(k), delta2=t==='entree'?q:t==='sortie'?-q:q-cur;
  if((t!=='inventaire'&&q<=0)||(t==='inventaire'&&q<0))return toast('Écris une quantité valide',true);
  if(!delta2)return toast('Le stock est déjà à '+cur);
  var note=t==='inventaire'?'Inventaire : '+cur+' → '+q:(prompt('Note (fournisseur, transfert vers une autre page…)','')||'');
  guard(function(){return mvt({produitId:k,pageId:p.pageId,qte:delta2,type:t==='inventaire'?'inventaire':t==='entree'?'entree':'sortie',note:note})
    .then(function(){journal('Stock '+p.nom,(delta2>0?'+':'')+delta2+' · '+pName(p.pageId)+(note?' · '+note:''));setv('mq_'+k,'');toast('Stock mis à jour')},fail)});
}
function addDep(){
  var m=n(val('ndM'));if(m<=0)return toast('Écris le montant',true);
  guard(function(){return col('depenses').doc(rid()).set({date:val('ndDate')||today(),categorie:val('ndCat'),montant:m,pageId:val('ndPage'),note:val('ndNote'),le:nowIso(),par:S.meName||''})
    .then(function(){journal('Dépense',val('ndCat')+' · '+ar(m)+' · '+(val('ndPage')?pName(val('ndPage')):'commune'));setv('ndM','');setv('ndNote','');toast('Dépense ajoutée')},fail)});
}
function delDoc(p){
  var a=p.split('/');if(!confirm('Supprimer cette ligne ? Cette action est notée dans l’historique.'))return;
  var old=S[a[0]][a[1]];
  guard(function(){return col(a[0]).doc(a[1]).delete().then(function(){journal('Suppression '+a[0],JSON.stringify(old));toast('Supprimé')},fail)});
}
function saveReg(){
  var modes=val('rgModes').split(',').map(function(x){return x.trim()}).filter(Boolean);
  guard(function(){return col('reglages').doc('general').set({seuil:n(val('rgSeuil')),repartition:val('rgRep'),modes:modes}).then(function(){journal('Paramètres','');toast('Paramètres enregistrés')},fail)});
}
function exportXlsx(){
  var r=range(), rows=vendorRows(r[0],r[1]);
  var A=[['Vendeur','Pages','Commandes','Ventes','1er paiement','2ème paiement','Total encaissé','Espèces','MVola','Orange','Reste impayé','À reverser','Versé','Écart']].concat(rows.map(function(x){return [vName(x.v),Object.keys(x.pages).map(pName).join(', '),x.nb,x.ventes,x.p1,x.p2,x.enc,x.es,x.mv,x.or,x.reste,x.aRev,x.verse,x.ecart]}));
  var B=[['N°','Date','Page','Vendeur','Client','Téléphone','Adresse','Produit','Qté','PU','Montant','Payé','Reste','Statut','Livraison']].concat(cmdsIn(r[0],r[1]).map(function(k){var c=S.commandes[k];return [c.num,c.date,pName(c.pageId),vName(c.vendeurId),c.client,c.tel||'',c.adresse||'',c.produit,n(c.qte)-retQte(c),n(c.pu),c.statut==='annulee'?0:eff(c),paye(k),reste(c,k),payState(c,k)[0],LIV[c.livraison||'a_preparer']]}));
  var C=[['Date','Commande','Client','Page','Vendeur','Mode','Type','Montant']].concat(Object.keys(S.paiements).filter(function(k){var p=S.paiements[k];return inR(p.date,r[0],r[1])&&match(p)}).map(function(k){var p=S.paiements[k],c=S.commandes[p.commandeId]||{};return [p.date,c.num||'',c.client||'',pName(p.pageId),vName(p.vendeurId),modeName(p.mode),p.type,n(p.montant)]}));
  var name='gestock_'+r[0]+(r[1]!==r[0]?'_'+r[1]:'')+'.xlsx';
  if(window.XLSX){var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(A),'Versements');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(B),'Commandes');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(C),'Paiements');
    var out=XLSX.write(wb,{bookType:'xlsx',type:'array'});dl(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),name);return}
  dl(new Blob(['﻿'+B.map(function(l){return l.map(function(x){return '"'+String(x).replace(/"/g,'""')+'"'}).join(';')}).join('\n')],{type:'text/csv'}),name.replace('.xlsx','.csv'));
}
function dl(blob,name){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000)}

/* ---------- Événements ---------- */
function setPreset(v){
  var t=today();
  if(v==='auj')S.per={mode:'jour',ref:t,d1:S.per.d1,d2:S.per.d2};
  else if(v==='hier')S.per={mode:'jour',ref:addD(t,-1),d1:S.per.d1,d2:S.per.d2};
  else if(v==='sem')S.per={mode:'semaine',ref:t,d1:S.per.d1,d2:S.per.d2};
  else if(v==='mois')S.per={mode:'mois',ref:t,d1:S.per.d1,d2:S.per.d2};
  else if(v==='an')S.per={mode:'annee',ref:t,d1:S.per.d1,d2:S.per.d2};
  else if(v==='perso'){var r=range();S.per={mode:'perso',ref:S.per.ref,d1:r[0],d2:r[1]}}
}
function shift(dir){
  var p=S.per,d=pd(p.ref);
  if(p.mode==='jour')p.ref=addD(p.ref,7*dir);else if(p.mode==='semaine')p.ref=addD(p.ref,7*dir);
  else if(p.mode==='mois')p.ref=ymd(new Date(d.getFullYear(),d.getMonth()+dir,1));else if(p.mode==='annee')p.ref=(d.getFullYear()+dir)+'-06-15';
}
document.addEventListener('click',function(e){
  var t=e.target.closest('button,a[data-act]');if(!t)return;
  var ds=t.dataset;
  if(ds.nav){S.view=ds.nav;S.sideOpen=false;S.cmdQ='';saveUi();render();window.scrollTo(0,0);return}
  if(ds.mode){if(ds.mode==='perso')setPreset('perso');else{S.per.mode=ds.mode;if(S.per.mode!=='perso'&&S.per.ref>today())S.per.ref=today()}render();return}
  if(ds.ref){S.per.ref=ds.ref;render();return}
  if(ds.shift){shift(+ds.shift);render();return}
  if(ds.ftab){S.formTab=ds.ftab;render();return}
  if(ds.vers!==undefined&&!ds.act){dialogVers(ds.vers);return}
  if(ds.pay){savePay(ds.pay);return}
  if(ds.mv){moveStock(ds.mv);return}
  if(ds.editprod){editProd(ds.editprod);return}
  if(ds.del){delDoc(ds.del);return}
  if(ds.livst!=null){S.livSt=ds.livst;render();return}
  var a=ds.act;if(!a)return;
  e.preventDefault();
  if(a==='menu'){S.sideOpen=!S.sideOpen;render()}
  else if(a==='auj'){S.per.mode=S.per.mode==='perso'?'jour':S.per.mode;S.per.ref=today();render()}
  else if(a==='export')exportXlsx();
  else if(a==='print')window.print();
  else if(a==='saveCmd')saveCmd();
  else if(a==='annuler')annuler();
  else if(a==='retour')retour();
  else if(a==='echange')echange();
  else if(a==='saveVers')saveVers();
  else if(a==='closeDlg')closeDlg();
  else if(a==='addProd')addProd();
  else if(a==='addDep')addDep();
  else if(a==='saveReg')saveReg();
  else if(a==='logout'&&window.CB_WEB)window.CB_WEB.deconnexion();
});
document.addEventListener('click',function(e){if(S.sideOpen&&!e.target.closest('.side')&&!e.target.closest('[data-act="menu"]')){S.sideOpen=false;render()}});
document.addEventListener('change',function(e){
  var t=e.target, ds=t.dataset;
  if(ds.ch==='preset'){setPreset(t.value);render();return}
  if(ds.ch==='d1'||ds.ch==='d2'){if(t.value){S.per[ds.ch]=t.value;render()}return}
  if(ds.ch==='fPage'||ds.ch==='fVend'||ds.ch==='cmdSt'||ds.ch==='prodPage'){S[ds.ch]=t.value;render();return}
  if(ds.re){onRe(t);return}
  if(ds.liv){var c=S.commandes[ds.liv];guard(function(){return col('commandes').doc(ds.liv).update({livraison:t.value,livraisonLe:nowIso()}).then(function(){journal('Livraison '+(c&&c.num||''),LIV[t.value])},fail)});return}
  if(ds.livreur){guard(function(){return col('commandes').doc(ds.livreur).update({livreur:t.value.trim()}).catch(fail)});return}
  if(ds.ia){var on=t.checked;guard(function(){return col('gsPages').doc(ds.ia).set(Object.assign({},S.gsPages[ds.ia]||{},{autoIA:on})).then(function(){journal('Réponse auto IA',pName(ds.ia)+' · '+(on?'activée':'désactivée'))},fail)});return}
  if(ds.frais){guard(function(){return col('gsPages').doc(ds.frais).set(Object.assign({},S.gsPages[ds.frais]||{},{fraisLivraison:n(t.value)})).catch(fail)});return}
});
var qT=null;
document.addEventListener('input',function(e){
  var t=e.target;
  if(t.dataset.ch==='cmdQ'){S.cmdQ=t.value;clearTimeout(qT);qT=setTimeout(render,250);return}
  if(t.id==='fcClient'){var c=clientList().filter(function(x){return x.nom===t.value})[0];if(c){if(!val('fcTel'))setv('fcTel',c.tel||'');if(!val('fcAdr'))setv('fcAdr',c.adresse||'')}}
  recalc();
});

/* ---------- Démarrage ---------- */
function boot(){
  if(!window.claude||!window.claude.use){S.ready=true;document.getElementById('app').innerHTML='<div class="wait">Gestock FB n’est pas relié à sa base de données.</div>';return}
  Promise.all([window.claude.use('db'),window.claude.use('user')]).then(function(r){
    S.db=r[0];var u=r[1];
    return Promise.all([u.isOwner(),u.id(),u.name?u.name():'']).then(function(x){
      S.admin=!!x[0];S.me=x[1];S.meName=x[2]||(S.admin?'Administrateur':'');
      var go=function(){
        Object.keys(COLS).forEach(function(k){
          S.db.collection(COLS[k]).onSnapshot(function(s){var m={};s.docs.forEach(function(d){m[d.id]=d.data()});S[k]=m;S.loaded[k]=1;soft()},function(err){console.warn(k,err)});
        });
        S.ready=true;render();
      };
      if(!S.admin&&S.me){return S.db.doc('membres/'+S.me).get().then(function(s){var d=s.exists?s.data():{};S.myCode=d&&d.invitation||null;if(S.myCode){S.fVend='inv_'+S.myCode}go()})}
      go();
    });
  }).catch(function(e){console.error(e);S.ready=true;document.getElementById('app').innerHTML='<div class="wait">Impossible d’ouvrir Gestock : '+esc(e&&e.message||e)+'</div>'});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
