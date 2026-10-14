/* Compte Boost : garde une copie du site pour qu'il s'ouvre même sans Internet.
   Réseau d'abord (toujours la dernière version quand Internet marche), copie en secours sinon.
   Les données ne passent pas par ici : elles sont gérées par l'application (copie locale + envoi automatique). */
var CACHE='compte-boost-site';
self.addEventListener('install',function(e){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
function garder(u){return u.origin===self.location.origin||/^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname)}
self.addEventListener('fetch',function(e){
  var r=e.request;if(r.method!=='GET')return;
  var u=new URL(r.url);if(!garder(u))return;
  e.respondWith(fetch(r).then(function(res){
    if(res&&(res.ok||res.type==='opaque')){var c=res.clone();caches.open(CACHE).then(function(k){k.put(r,c)})}
    return res;
  }).catch(function(){
    return caches.match(r,{ignoreSearch:false}).then(function(m){return m||(r.mode==='navigate'?caches.match(new URL('./',self.location).href).then(function(x){return x||caches.match(r,{ignoreSearch:true})}):caches.match(r,{ignoreSearch:true}))});
  }));
});
