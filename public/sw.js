// 旧アプリ(かけいぼ)が同じURLでService Workerを登録していた場合に、
// そのキャッシュと登録を確実に取り除くための後始末用ファイル。
// このアプリ自体は Service Worker を使わない。
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })(),
  );
});
