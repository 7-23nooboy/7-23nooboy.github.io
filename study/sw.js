"use strict";
importScripts("asset-manifest.js");

const cacheName = "study-reader-" + self.STUDY_ASSET_VERSION;
const assets = self.STUDY_ASSETS.map(asset => new URL(asset, self.location.href).href);
const allowed = new Set(assets);
const indexUrl = new URL("index.html", self.location.href).href;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("study-reader-") && key !== cacheName).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const entryPaths = [new URL("./", self.location.href).pathname, new URL("index.html", self.location.href).pathname];
  if (event.request.mode === "navigate" && entryPaths.includes(url.pathname)) {
    event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(indexUrl)) || fetch(event.request)));
    return;
  }
  if (!allowed.has(url.href)) return;
  event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
});