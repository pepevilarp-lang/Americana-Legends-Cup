/* =====================================================================
   Analítica de uso (PostHog, servidores en la UE) · mismo archivo en la Lliga y en la Americana
   - No hace nada hasta que hay una clave en window.DX_ANALYTICS.key (config.js).
   - Solo se carga si la persona acepta. Sin respuesta o con «No», no sale nada.
   - Registra: pantallas, toques en botones, duración de las sesiones, mapa de calor
     y grabación de la sesión con los campos de texto ocultos.
   - Cada persona se identifica con su id interno de Firebase, no con el email.
   API para la app: dxIdentify(id, props), dxTrack(nombre, props), dxConsentOpen()
   ===================================================================== */
(function () {
  const C = Object.assign({ key: '', host: 'https://eu.i.posthog.com', app: 'app', screenOf: null, actionAttrs: ['data-act'], privacyUrl: '' }, window.DX_ANALYTICS || {});
  const K = 'dx-consent-v1', ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  let on = false, queue = [], who = null, lastUrl = '';
  const noop = () => {};
  window.dxIdentify = noop; window.dxTrack = noop; window.dxConsentOpen = noop;
  if (!C.key) return;

  const screen = () => { const h = (location.hash || '').replace(/^#/, '') || 'inicio'; try { return C.screenOf ? C.screenOf(h) : h; } catch (e) { return h; } };
  function pageview() {
    const url = location.pathname + location.hash; if (url === lastUrl) return; lastUrl = url;
    capture('$pageview', { pantalla: screen() });
  }
  function capture(ev, props) { const p = Object.assign({ app: C.app }, props || {}); if (on && window.posthog?.capture) posthog.capture(ev, p); else if (!on) queue.length < 50 && queue.push([ev, p]); }

  function load() {
    if (on) return; on = true;
    // Fragmento oficial de PostHog (carga array.js desde su CDN de la UE)
    !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "init capture register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled getFeatureFlag identify setPersonProperties group startSessionRecording stopSessionRecording".split(" "), n = 0; n < o.length; n++)g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);
    posthog.init(C.key, {
      api_host: C.host, person_profiles: 'identified_only',
      capture_pageview: false, capture_pageleave: true,      // las pantallas las marcamos nosotros (la app cambia de pantalla sin recargar)
      autocapture: true, enable_heatmaps: true,
      session_recording: { maskAllInputs: true, maskInputOptions: { password: true, email: true, tel: true } },
      respect_dnt: true, disable_surveys: true
    });
    posthog.register({ app: C.app });
    queue.forEach(([e, p]) => posthog.capture(e, p)); queue = [];
    if (who) posthog.identify(who.id, who.props);
    lastUrl = ''; pageview();
  }

  window.dxIdentify = (id, props) => {
    if (!id) return; const nx = { id: String(id), props: Object.assign({ app: C.app }, props || {}) };
    if (who && who.id === nx.id && JSON.stringify(who.props) === JSON.stringify(nx.props)) return;
    who = nx; if (on && window.posthog?.identify) posthog.identify(who.id, who.props);
  };
  window.dxTrack = (name, props) => capture(name, props);

  // Pantallas: cambios de # (Lliga) y history.replaceState (Americana)
  addEventListener('hashchange', pageview);
  const rs = history.replaceState, ps = history.pushState;
  history.replaceState = function () { const r = rs.apply(this, arguments); setTimeout(pageview, 0); return r; };
  history.pushState = function () { const r = ps.apply(this, arguments); setTimeout(pageview, 0); return r; };
  // Acciones con nombre (data-act="conv-save", data-tab="clasificacion"...): más fáciles de leer que el autocapture
  document.addEventListener('click', e => {
    if (!on) return; for (const a of C.actionAttrs) { const el = e.target.closest?.('[' + a + ']'); if (el) { capture('accion', { accion: el.getAttribute(a), valor: el.dataset.v || el.dataset.k || undefined, tipo: a.replace(/^data-/, ''), pantalla: screen() }); return; } }
  }, true);

  // ---------- Consentimiento ----------
  const CSS = `#dxc{position:fixed;left:12px;right:12px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:99990;max-width:460px;margin:0 auto;background:#111a16;color:#eef2ef;border-radius:16px;padding:16px;box-shadow:0 10px 40px rgba(0,0,0,.35);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
#dxc b{display:block;font-size:15px;margin-bottom:4px}#dxc p{margin:0 0 12px;color:#b9c4be}#dxc a{color:#e2c47c}
#dxc .r{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}#dxc button{font:600 14px system-ui,sans-serif;border-radius:999px;padding:9px 16px;cursor:pointer;border:1px solid #3a4741;background:transparent;color:#eef2ef}
#dxc button.y{background:#e2c47c;border-color:#e2c47c;color:#14201b}`;
  function ask(force) {
    if (document.getElementById('dxc')) return; if (!force && ls.get(K)) return;
    if (!document.getElementById('dxc-css')) { const s = document.createElement('style'); s.id = 'dxc-css'; s.textContent = CSS; document.head.appendChild(s); }
    const d = document.createElement('div'); d.id = 'dxc'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Estadísticas de uso');
    d.innerHTML = `<b>¿Nos ayudas a mejorar la app?</b><p>Con tu permiso medimos cómo se usa: qué pantallas abres, qué botones tocas y cuánto tiempo pasas, y grabamos la sesión con lo que escribes oculto. Lo usamos solo para mejorar la app.${C.privacyUrl ? ` <a href="${C.privacyUrl}" target="_blank" rel="noopener">Más información</a>` : ''}</p><div class="r"><button data-dx="no">No, gracias</button><button class="y" data-dx="yes">Aceptar</button></div>`;
    document.body.appendChild(d);
    d.addEventListener('click', e => { const b = e.target.closest('[data-dx]'); if (!b) return; const yes = b.dataset.dx === 'yes';
      ls.set(K, yes ? 'yes' : 'no'); d.remove();
      if (yes) load(); else if (on && window.posthog?.opt_out_capturing) { posthog.opt_out_capturing(); posthog.reset(); } });
  }
  window.dxConsentOpen = () => ask(true);
  window.dxConsent = () => ls.get(K);

  if (ls.get(K) === 'yes') load();
  else if (!ls.get(K)) {   // se pregunta cuando la persona ya ha entrado (no en la pantalla de acceso)
    const t = setInterval(() => { if (who) { clearInterval(t); setTimeout(() => ask(false), 2500); } }, 1000);
  }
})();
