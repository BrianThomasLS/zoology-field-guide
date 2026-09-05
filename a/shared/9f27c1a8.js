// Void Nano monetization + analytics, loaded as one first-party-looking asset from our own
// jsDelivr repo at a random path, so an adblock URL filter has nothing to match. It carries:
//   - Google Analytics (same property as vng.lol: G-T34LJ31JJD), tracking every game open
//     under one id so a session that plays five games is one user, five views.
//   - Adsterra banners (the exact keys the live site uses), each in its own srcdoc iframe.
//   - The Adsterra smartlink popunder (the exact Direct Link), opened by us on a real gesture,
//     planted into the game frames too, capped the same as vng.lol.
//   - Client-side anti-adblock: randomized container class names, a bait probe, per-frame
//     refusal signalling, and empty-slot collapse so a blocked slot never shows a bare label.
// There is no server here, so the server-relay half of vng.lol's anti-adblock (WARP proxy of
// blocked creatives) cannot exist; loaders being first-party is the part that ports.
(function () {
  if (window.__vnAds) return
  window.__vnAds = 1

  var GA = 'G-T34LJ31JJD'
  var AD_HOST = 'https://researchingsweatexit.com'
  // The smartlink popunder's exact Direct Link (kept as the site keeps it: base64 so the
  // advertiser host is not sitting in the markup for a filter to read).
  var POP = atob('aHR0cHM6Ly9yZXNlYXJjaGluZ3N3ZWF0ZXhpdC5jb20vbnZlcHcxanh1ZT9rZXk9YWI2NjhhMDlhMDNkNjFkMGEzOWU5NjQwOTkyMzA4M2I=')
  // Our own copy of gtag.js on jsDelivr, so the analytics loader is not googletagmanager.com
  // for a filter to catch. Falls back to Google's own url if our copy ever 404s.
  var GTAG_SELF = 'https://cdn.jsdelivr.net/gh/freeedu-pixel/voidgames-21@main/a/shared/e2c4b019.js'

  var UNITS = {
    lead:  { key: '66c475d5203ae1e74a43cd60995dad8d', w: 728, h: 90 },
    wide:  { key: '0cfbec7c3ff4adab34ae356c3f48778d', w: 468, h: 60 },
    strip: { key: 'd5fa20f5bb7812a9c6caef6dc9a4f566', w: 320, h: 50 },
    box:   { key: 'a09c54129dde0afbeaa739509582e66f', w: 300, h: 250 },
    tower: { key: '1c101afa67ea06dcafa85edd8654c9c3', w: 160, h: 600 }
  }

  function rnd () { return 'x' + Math.random().toString(36).slice(2, 9) }

  // ---------------------------------------------------------------- Google Analytics
  window.dataLayer = window.dataLayer || []
  function gtag () { window.dataLayer.push(arguments) }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', GA, { transport_type: 'beacon' })
  ;(function () {
    var s = document.createElement('script')
    s.async = true; s.src = GTAG_SELF
    s.onerror = function () {
      var g = document.createElement('script')
      g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA
      document.head.appendChild(g)
    }
    document.head.appendChild(s)
  }())
  // One id, one user, a view per game. Called by the app when a game opens.
  window.__vnTrack = function (name) {
    try {
      var path = '/g/' + encodeURIComponent(String(name || 'game'))
      gtag('event', 'page_view', { page_title: String(name || 'game'), page_path: path, page_location: location.origin + path })
      gtag('event', 'game_open', { game_name: String(name || 'game') })
    } catch (e) {}
  }

  // ---------------------------------------------------------------- Adsterra banners
  var blocked = false
  // Each unit MUST have its own document: the network's tag reads a GLOBAL atOptions at load,
  // so two in one page race and overwrite each other. srcdoc gives each its own realm.
  function frameFor (u) {
    var f = document.createElement('iframe')
    f.width = u.w; f.height = u.h; f.scrolling = 'no'; f.setAttribute('frameborder', '0')
    f.setAttribute('title', 'content'); f.setAttribute('data-vad', '1')
    f.style.cssText = 'border:0;display:block;width:' + u.w + 'px;height:' + u.h + 'px;overflow:hidden;margin:0 auto'
    var tag = '<' + 'script>atOptions=' + JSON.stringify({ key: u.key, format: 'iframe', height: u.h, width: u.w, params: {} }) + ';<' + '/script>'
    var ld = '<' + 'script src="' + AD_HOST + '/' + u.key + '/invoke.js" onerror="parent.postMessage(\'vad-refused\',\'*\')"><' + '/script>'
    f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>' + tag + ld + '</body></html>'
    return f
  }
  // Pick the widest unit that fits the slot; lead -> wide -> strip for a top rail.
  function unitFor (slot, w) {
    if (slot === 'box') return UNITS.box
    if (slot === 'tower') return UNITS.tower
    if (w >= 728) return UNITS.lead
    if (w >= 468) return UNITS.wide
    return UNITS.strip
  }
  function fill (host) {
    var slot = host.getAttribute('data-vslot') || 'lead'
    var w = host.clientWidth || host.offsetWidth || innerWidth
    var u = unitFor(slot, w)
    host.textContent = ''
    var cls = rnd()
    host.className = (host.className + ' ' + cls).trim()
    var lab = document.createElement('div')
    lab.textContent = 'Advertisement'
    lab.style.cssText = 'font:11px system-ui,sans-serif;color:rgba(255,255,255,.35);text-align:center;letter-spacing:.08em;margin:0 0 6px'
    host.appendChild(lab)
    var fr = frameFor(u)
    host.appendChild(fr)
    // If nothing paints (blocked / empty), drop the whole thing so no bare labelled box shows.
    setTimeout(function () {
      var d = null
      try { d = fr.contentDocument } catch (e) { d = null }
      // cross-origin (a creative took the frame) reads as null in Chrome -> treat as filled.
      if (d && d.body && d.body.innerHTML.replace(/\s/g, '').length < 40) { host.style.display = 'none' }
    }, 11000)
  }
  window.addEventListener('message', function (e) {
    if (e && e.data === 'vad-refused') { blocked = true }
  })
  function banners () {
    var slots = document.querySelectorAll('[data-vslot]')
    for (var i = 0; i < slots.length; i++) fill(slots[i])
  }

  // ---------------------------------------------------------------- Popunder (smartlink)
  // The exact Direct Link the site uses, opened by us on a real gesture, capped the same way:
  // once per page view, a 10s floor, a 20/hour ceiling. Planted on every same-origin frame
  // (the game blobs inherit our origin) so a click inside a game counts. Nothing is cancelled,
  // so links, buttons, forms and the games behave exactly as before.
  var GAP = 10000, MAX = 20, HOUR = 3600000, PKEY = 'v-pk', fired = false
  function seen () {
    try { var raw = localStorage.getItem(PKEY); if (!raw) return []
      var now = Date.now(); return JSON.parse(raw).filter(function (t) { return typeof t === 'number' && now - t < HOUR }) } catch (e) { return [] }
  }
  function go () {
    if (fired) return
    var now = Date.now(), list = seen()
    if (list.length >= MAX) return
    if (list.length && now - list[list.length - 1] < GAP) return
    var w
    try { w = window.open(POP, '_blank') } catch (e) { w = null }
    if (!w) return
    try { w.opener = null } catch (e) {}
    fired = true
    try { list.push(now); localStorage.setItem(PKEY, JSON.stringify(list.slice(-MAX))) } catch (e) {}
    try { window.focus() } catch (e) {}
  }
  function plant (win) {
    try { win.addEventListener('click', go, true); win.addEventListener('pointerdown', go, true) } catch (e) { return }
    var fr
    try { fr = win.document.getElementsByTagName('iframe') } catch (e) { return }
    for (var i = 0; i < fr.length; i++) { try { if (fr[i].contentWindow) plant(fr[i].contentWindow) } catch (e) {} }
  }
  function popInit () {
    plant(window)
    try { setInterval(function () { plant(window) }, 1000) } catch (e) {}
    document.addEventListener('load', function (e) {
      if (e.target && e.target.tagName === 'IFRAME') { try { plant(e.target.contentWindow) } catch (x) {} }
    }, true)
  }

  // ---------------------------------------------------------------- Anti-adblock: detect
  // A bait element carrying the class names filter lists ship, measured a beat after insert.
  // If it is hidden or zeroed, a blocker is present; we still try to fill (loaders are
  // first-party), and the empty-collapse above keeps a blocked slot from showing a bare label.
  function bait (cb) {
    var b = document.createElement('div')
    b.className = 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links ad-banner adsbox ad-placement'
    b.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px'
    document.body.appendChild(b)
    setTimeout(function () {
      var hidden = false
      try { hidden = b.offsetParent === null || b.offsetHeight === 0 || b.clientHeight === 0 || getComputedStyle(b).display === 'none' } catch (e) {}
      if (hidden) blocked = true
      try { b.remove() } catch (e) {}
      cb()
    }, 120)
  }

  function start () {
    bait(function () { banners() })
    popInit()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
}())
