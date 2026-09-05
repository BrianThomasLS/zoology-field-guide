
// Self-hosted on Void Network.
//
// Upstream points this at the mod author's own backend, which serves ACCOUNTS
// (/api/auth/register, /api/auth/login, /api/auth/me, /api/auth/logout) and SAVES
// (/api/saves). Left alone, anyone playing here would be registering an account and
// typing a password into what looks like part of this site, with the credentials and
// their save data going to a third party.
//
// Upstream's own self-hosted answer is '', and that is worse here rather than better:
// a game under /lg/ runs same-origin with the site, so '' would aim those login and
// register POSTs straight at OUR /api/auth/* - which exist - carrying the player's real
// session cookie.
//
// So neither. A dead path inside the game's own folder: every api call it makes lands on
// the static mount, 404s, and nothing leaves the browser. The main levels and the built-in
// level creator are entirely local and unaffected. The online level browser needs a backend
// we do not run, so it stays off.
//
// To put the online features back, return 'https://webdasher-backend.itzar.dev' here and
// accept that accounts and saves are handled by that third party.
window._apiBase = '/lg/webdashers/_nobackend';
