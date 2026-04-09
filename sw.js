// Church App - Service Worker
// Cache básico para funcionamento offline e instalação PWA

var CACHE_NAME = 'church-app-v1';
var ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/helpers.js',
  '/js/planos.js',
  '/js/agenda.js',
  '/js/services.js',
  '/js/equipe.js',
  '/js/admin.js',
  '/js/onboarding.js',
  '/js/superadmin.js',
  '/js/sermao.js',
  '/js/app.js',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Instalar e cachear assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Ativar e limpar caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Interceptar requests: network first, cache fallback
self.addEventListener('fetch', function(event) {
  // Ignorar requests para o Supabase e APIs externas (sempre online)
  var url = event.request.url;
  if (url.includes('supabase.co') ||
      url.includes('googleapis.com/css') === false && url.includes('googleapis.com') ||
      url.includes('emailjs.com') ||
      url.includes('jsdelivr.net')) {
    return;
  }

  // Estratégia: network first para HTML, cache first para assets estáticos
  if (event.request.mode === 'navigate') {
    // Páginas: tenta network, fallback para cache
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match('/index.html');
      })
    );
  } else {
    // Assets estáticos: cache first
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          if (response && response.status === 200 && response.type === 'basic') {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
  }
});
