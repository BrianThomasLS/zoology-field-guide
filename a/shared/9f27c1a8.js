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
  var UNITS = {
    lead:  { key: '66c475d5203ae1e74a43cd60995dad8d', w: 728, h: 90 },
    wide:  { key: '0cfbec7c3ff4adab34ae356c3f48778d', w: 468, h: 60 },
    strip: { key: 'd5fa20f5bb7812a9c6caef6dc9a4f566', w: 320, h: 50 },
    box:   { key: 'a09c54129dde0afbeaa739509582e66f', w: 300, h: 250 },
    tower: { key: '1c101afa67ea06dcafa85edd8654c9c3', w: 160, h: 600 }
  }

  function rnd () { return 'x' + Math.random().toString(36).slice(2, 9) }

  // ---------------------------------------------------------------- Google Analytics (GA4)
  // Sent with the Measurement Protocol straight to the collect endpoint, NOT gtag.js. The file
  // the reader opens can be a local file (file://) or any host, and gtag.js refuses to send a
  // hit from a file:// / null origin - measured, zero beacons. A plain request to /g/collect
  // carries the same property id and lands in the same GA4 property from anywhere, and there is
  // no googletagmanager.com in the page for a filter to catch.
  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer.push(arguments) }
  var CID = (function () { try { var c = localStorage.getItem('v-cid'); if (!c) { c = Math.floor(Math.random() * 1e10) + '.' + Math.floor(Date.now() / 1000); localStorage.setItem('v-cid', c) } return c } catch (e) { return Math.floor(Math.random() * 1e10) + '.' + Math.floor(Date.now() / 1000) } }())
  var SID = (function () { try { var s = sessionStorage.getItem('v-sid'); if (!s) { s = '' + Math.floor(Date.now() / 1000); sessionStorage.setItem('v-sid', s) } return s } catch (e) { return '' + Math.floor(Date.now() / 1000) } }())
  var seq = 0
  function gaHit (en, extra) {
    seq++
    var p = 'v=2&tid=' + GA + '&cid=' + encodeURIComponent(CID) + '&sid=' + SID + '&sct=1&seg=1&_p=' + Math.floor(Math.random() * 1e9) + '&_s=' + seq + '&en=' + encodeURIComponent(en)
    try { if (navigator.language) p += '&ul=' + encodeURIComponent(navigator.language.toLowerCase()) } catch (e) {}
    try { p += '&sr=' + screen.width + 'x' + screen.height } catch (e) {}
    if (extra) { for (var k in extra) { if (extra[k] != null) p += '&' + k + '=' + encodeURIComponent(extra[k]) } }
    var url = 'https://www.google-analytics.com/g/collect?' + p
    try { if (navigator.sendBeacon && navigator.sendBeacon(url)) return } catch (e) {}
    try { (new Image()).src = url } catch (e) {}
  }
  // First view of the site.
  gaHit('page_view', { dl: location.href, dt: document.title || 'Void Nano', dr: document.referrer || '' })
  // One id, one user, a view per game across EVERY game. Called by the app when a game opens.
  window.__vnTrack = function (name) {
    var n = String(name || 'game')
    gaHit('page_view', { dl: location.origin + '/g/' + encodeURIComponent(n), dt: n })
    gaHit('game_open', { 'ep.game_name': n })
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
    // A full-width top rail measures its own width unreliably before layout settles; the
    // leaderboard is the viewport's width, so size it off that.
    var rect = 0
    try { rect = host.getBoundingClientRect().width || 0 } catch (e) {}
    var w = slot === 'lead' ? Math.max(rect, host.clientWidth || 0, innerWidth - 44) : (rect || host.clientWidth || innerWidth)
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
