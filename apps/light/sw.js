/* МИНИМАЛЬНЫЙ service worker — только для УСТАНАВЛИВАЕМОСТИ (Chromium требует зарегистрированный SW с
   fetch-обработчиком, иначе beforeinstallprompt не срабатывает и кнопка «Install» не появится).
   ПРИНЦИПИАЛЬНО БЕЗ КЭША: fetch-обработчик пустой (respondWith не зовём) → каждый запрос идёт в сеть как
   обычно. Значит НИЧЕГО не кэшируется и не может «застрять» устаревшим — камера, звук, Karplus-ворклет и
   относительные пути под подпапкой GitHub Pages работают ровно как без SW. Если позже понадобится офлайн,
   кэш добавляется здесь; сейчас его сознательно нет. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* no-op: сеть по умолчанию, ничего не перехватываем и не кэшируем */ });
