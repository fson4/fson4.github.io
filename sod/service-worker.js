const rev = "SoD-001",
	app = [
		"https://fson4.github.io/sod/",
		"app.webmanifest",
		"resource/font/inter.woff2",
		"resource/font/noto.woff2",
		"resource/style.css",
		"resource/script.js",
		"resource/img/icon.svg",
		"resource/img/icon.png"
	]
self.addEventListener("install", e => e.waitUntil(caches.open(rev).then(c => c.addAll(app))))
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.map(key => { if (/SoD/.test(key) && key !== rev) return caches.delete(key) })))))
self.addEventListener("fetch", e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))))
