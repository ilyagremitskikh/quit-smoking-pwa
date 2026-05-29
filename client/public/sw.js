/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "QuitKit";
  const options = {
    body: data.body || "Есть новое напоминание",
    icon: "/icons/icon-192.png",
    badge: "/icons/maskable-192.png",
    data: {
      url: data.url || "/"
    }
  };

  const tasks = [self.registration.showNotification(title, options)];

  if ("setAppBadge" in self.navigator && typeof data.badgeCount === "number") {
    tasks.push(self.navigator.setAppBadge(data.badgeCount));
  }

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      if ("clearAppBadge" in self.navigator) {
        await self.navigator.clearAppBadge();
      }

      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(url);
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});
