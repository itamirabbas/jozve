/* Jozve Reader service worker: keeps the reader itself available offline. Your files live in the reader's own storage, not here. */
var V = 'jzr-6341afd41a';
var SHELL = ['./', './index.html', './manifest.webmanifest', './Vazirmatn.woff2', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('jzr-') === 0 && k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (/\/content\.json$/.test(new URL(r.url).pathname)) return; // announcements & books: always straight from the network (the app keeps its own offline copy)
  var nav = r.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(r.url).pathname);
  if (nav) { // always try the newest reader first (updates appear as soon as there is internet), fall back to the saved copy offline
    e.respondWith(caches.open(V).then(function (c) {
      var net = fetch(r.url, { cache: 'no-store', credentials: 'same-origin' }).then(function (res) { if (res && res.ok) c.put('./index.html', res.clone()); return res; });
      var late = new Promise(function (ok) { setTimeout(ok, 4000); }).then(function () { return c.match('./index.html'); });
      return Promise.race([net, late.then(function (hit) { return hit || net; })]).then(function (res) { return res || net; }).catch(function () { return c.match('./index.html').then(function (hit) { return hit || net; }); });
    }));
    return;
  }
  e.respondWith(caches.open(V).then(function (c) {
    var key = nav ? './index.html' : r;
    return c.match(key, { ignoreSearch: nav }).then(function (hit) {
      var net = fetch(r).then(function (res) { if (res && res.ok && res.type === 'basic') c.put(key, res.clone()); return res; });
      if (hit) { net.catch(function () {}); return hit; }
      return net.catch(function () { return c.match('./index.html'); });
    });
  }));
});
