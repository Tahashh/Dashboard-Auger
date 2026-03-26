self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: [
        { action: 'update', title: 'Aggiorna' },
        { action: 'ignore', title: 'Ignora' },
        { action: 'uninstall', title: 'Disinstalla' }
      ]
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'uninstall') {
    event.waitUntil(
      self.registration.pushManager.getSubscription().then(function(subscription) {
        if (subscription) {
          return subscription.unsubscribe().then(function() {
            // Send request to server to remove subscription
            return fetch('/api/push/unsubscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
          });
        }
      }).then(function() {
        return self.registration.unregister();
      })
    );
  } else if (event.action === 'update' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        // If there is already a window/tab open, refresh and focus it
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url && 'focus' in client) {
            client.postMessage({ type: 'UPDATE_APP' });
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/?update=true');
        }
      })
    );
  }
});
