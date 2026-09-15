self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  let payload = { title: 'Nova Notificação', body: 'Você tem uma nova mensagem.', url: '/' };
  if (event.data) {
    try {
      payload = Object.assign(payload, event.data.json());
    } catch(e) {}
  }
  
  const options = {
    body: payload.body,
    data: { url: payload.url || '/' }
  };
  
  event.waitUntil(
    self.registration.showNotification(payload.title, options).catch(err => console.error("SW showNotification erro:", err))
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        // Verifica se já tem uma janela aberta para focar
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(event.notification.data.url) && 'focus' in client) {
            return client.focus();
          }
        }
        // Se não tiver, abre uma nova
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
    );
  }
});
