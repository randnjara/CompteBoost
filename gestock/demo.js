/* Gestock FB : mode démonstration (?demo=1). Données fictives en mémoire, rien n'est envoyé à la base. */
(function(){
"use strict";
if(!window.GS_DEMO)return;
var store={}, subs={};
function parentOf(p){var i=p.lastIndexOf('/');return i<0?'':p.slice(0,i)}
function idOf(p){return p.slice(p.lastIndexOf('/')+1)}
function rid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function snap(parent){var m=store[parent]||{};var docs=Object.keys(m).sort().map(function(p){var d=m[p];return {id:idOf(p),exists:true,data:function(){return d}}});return {docs:docs,size:docs.length,empty:!docs.length}}
function notify(parent){(subs[parent]||[]).forEach(function(cb){cb(snap(parent))})}
function put(path,data){var p=parentOf(path);store[p]=store[p]||{};if(data==null)delete store[p][path];else store[p][path]=data;notify(p)}
function docRef(path){return {id:idOf(path),path:path,
  get:function(){var d=(store[parentOf(path)]||{})[path];return Promise.resolve({id:idOf(path),exists:!!d,data:function(){return d}})},
  set:function(d){put(path,JSON.parse(JSON.stringify(d)));return Promise.resolve()},
  update:function(patch){var o=(store[parentOf(path)]||{})[path]||{};put(path,Object.assign({},o,JSON.parse(JSON.stringify(patch))));return Promise.resolve()},
  delete:function(){put(path,null);return Promise.resolve()}}}
function colRef(parent){return {path:parent,doc:function(id){return docRef(parent+'/'+(id||rid()))},
  add:function(d){var r=docRef(parent+'/'+rid());return r.set(d).then(function(){return r})},
  get:function(){return Promise.resolve(snap(parent))},
  onSnapshot:function(cb){(subs[parent]=subs[parent]||[]).push(cb);setTimeout(function(){cb(snap(parent))},0);return function(){}}}}
var db={doc:docRef,collection:colRef};

/* --- Données fictives --- */
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function day(n){var d=new Date();d.setDate(d.getDate()+n);return ymd(d)}
var pages=[['p1','Kapalapa PVC','RINA'],['p2','Chaussures Mada','TIANA'],['p3','Tech Store Mada','SOLOLO'],['p4','Fashion Shop','MAMY'],['p5','Maison & Déco','LINA']];
pages.forEach(function(p){put('pages/'+p[0],{nom:p[1],responsable:'inv_'+p[2]});put('membres/inv_'+p[2],{nom:p[2].charAt(0)+p[2].slice(1).toLowerCase()})});
var prods=[['a1','p1','Lambris PVC 3m',30000,18000],['a2','p1','Plafond PVC',45000,28000],['b1','p2','Chaussures cuir',60000,35000],['b2','p2','Sandales',35000,18000],
 ['c1','p3','Écouteurs Bluetooth',50000,30000],['c2','p3','Montre connectée',120000,80000],['d1','p4','Robe',70000,40000],['d2','p4','T-shirt',30000,15000],['e1','p5','Coussin déco',25000,12000],['e2','p5','Lampe',90000,55000]];
prods.forEach(function(p){put('gs_produits/'+p[0],{pageId:p[1],nom:p[2],prix:p[3],achat:p[4],seuil:3});put('gs_mouvements/i'+p[0],{produitId:p[0],pageId:p[1],qte:40,type:'entree',date:day(-20),le:new Date().toISOString(),note:'Stock initial'})});
var clients=['Rasoa','Hery','Lova','Feno','Mamy','Koto','Clara','Zo','Nirina','Faly','Tojo','Bako'];
var modes=['especes','mvola','orange'];
var seed=7;function rnd(n){seed=(seed*9301+49297)%233280;return Math.floor(seed/233280*n)}
var k=0;
for(var j=-9;j<=0;j++){
  var n=3+rnd(4);
  for(var i=0;i<n;i++){
    var pr=prods[rnd(prods.length)], q=1+rnd(3), tot=pr[3]*q, id='c'+(++k), pg=pages.filter(function(x){return x[0]===pr[1]})[0];
    var c={num:'CMD-'+String(k).padStart(5,'0'),date:day(j),le:new Date().toISOString(),pageId:pr[1],vendeurId:'inv_'+pg[2],client:clients[rnd(clients.length)],tel:'034 '+(10+rnd(89))+' '+(100+rnd(899))+' '+(10+rnd(89)),produitId:pr[0],produit:pr[2],pu:pr[3],qte:q,total:tot,statut:rnd(14)===0?'annulee':'confirmee',livraison:['a_preparer','en_cours','livree','livree'][rnd(4)]};
    put('gs_commandes/'+id,c);put('gs_mouvements/m'+id,{produitId:pr[0],pageId:pr[1],qte:-q,type:'vente',commandeId:id,date:c.date,le:c.le});
    if(c.statut==='annulee'){put('gs_mouvements/x'+id,{produitId:pr[0],pageId:pr[1],qte:q,type:'annulation',commandeId:id,date:c.date,le:c.le});continue}
    var r=rnd(10), p1=r<6?tot:r<9?Math.round(tot*0.6/1000)*1000:0;
    if(p1)put('gs_paiements/'+id+'a',{commandeId:id,date:c.date,montant:p1,mode:modes[rnd(3)],type:'paiement',pageId:c.pageId,vendeurId:c.vendeurId,le:c.le});
    if(p1&&p1<tot&&rnd(2))put('gs_paiements/'+id+'b',{commandeId:id,date:j<0?day(j+1):c.date,montant:tot-p1,mode:modes[rnd(3)],type:'paiement',pageId:c.pageId,vendeurId:c.vendeurId,le:c.le});
  }
}
for(var v=-9;v<0;v++)pages.forEach(function(p,ix){if(rnd(3))put('gs_versements/v'+v+ix,{date:day(v),vendeurId:'inv_'+p[2],montant:(80+rnd(200))*1000,mode:'especes',le:new Date().toISOString()})});
put('gs_depenses/d1',{date:day(-3),categorie:'Publicité Facebook',montant:150000,pageId:'p2',note:'Boost'});
put('gs_depenses/d2',{date:day(-2),categorie:'Salaires',montant:400000,pageId:'',note:'Commune'});
put('gs_depenses/d3',{date:day(-1),categorie:'Emballages',montant:35000,pageId:'p4',note:''});

var user={isOwner:function(){return Promise.resolve(true)},canEdit:function(){return Promise.resolve(true)},id:function(){return Promise.resolve('demo-admin')},name:function(){return Promise.resolve('Gérante (démo)')}};
var downloads={save:function(o){var blob=o.data instanceof Blob?o.data:new Blob([o.data]);var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=o.filename;document.body.appendChild(a);a.click();a.remove();return Promise.resolve(true)}};
window.claude={use:function(n){return Promise.resolve(n==='db'?db:n==='user'?user:n==='downloads'?downloads:null)}};
})();
