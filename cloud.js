// Bullsburg cloud: a tiny Supabase client (email sign-in codes + database functions). No library needed.
// Used by the app, the website and the teacher dashboard. window.TT_SB = { url, key } is set by build.py.
(function () {
  var CFG = window.TT_SB || {}, KEY = 'bullsburg.session';
  var ok = !!(CFG.url && CFG.key && !/PASTE/.test(CFG.key));
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function store(s) { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch (e) {} }
  var sess = load();
  function headers(auth) {
    var h = { 'apikey': CFG.key, 'Content-Type': 'application/json' };
    if (auth && sess) h.Authorization = 'Bearer ' + sess.access_token; return h;
  }
  function req(path, body, auth) {
    return fetch(CFG.url + path, { method: 'POST', headers: headers(auth), body: JSON.stringify(body || {}) })
      .then(function (r) { return r.text().then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {} if (!r.ok) { var e = new Error((j && (j.msg || j.message || j.error_description)) || ('Error ' + r.status)); e.status = r.status; e.body = j; throw e; } return j; }); });
  }
  function keep(j) { sess = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, email: (j.user && j.user.email) || (sess && sess.email) }; store(sess); return sess; }
  var refreshing = null;
  function fresh() {
    if (!sess) return Promise.resolve(null);
    if (sess.expires_at - Date.now() > 120000) return Promise.resolve(sess);
    if (!refreshing) refreshing = req('/auth/v1/token?grant_type=refresh_token', { refresh_token: sess.refresh_token })
      .then(keep).catch(function (e) { if (e.status === 400 || e.status === 401) { sess = null; store(null); } return sess; })
      .then(function (s) { refreshing = null; return s; });
    return refreshing;
  }
  window.TickerCloud = {
    configured: function () { return ok; },
    signedIn: function () { return !!sess; },
    email: function () { return sess && sess.email; },
    // sends a sign-in code to the email address (creates the account the first time)
    sendCode: function (email) { return req('/auth/v1/otp', { email: String(email).trim().toLowerCase(), create_user: true }); },
    verifyCode: function (email, code) { return req('/auth/v1/verify', { type: 'email', email: String(email).trim().toLowerCase(), token: String(code).replace(/\D/g, '') }).then(keep); },
    // teacher accounts: email + password (email confirmation is off; the setup code proves who they are)
    signUp: function (email, pw) { return req('/auth/v1/signup', { email: String(email).trim().toLowerCase(), password: pw }).then(function (j) { if (!j || !j.access_token) { var e = new Error('confirm'); e.status = 400; throw e; } return keep(j); }); },
    signIn: function (email, pw) { return req('/auth/v1/token?grant_type=password', { email: String(email).trim().toLowerCase(), password: pw }).then(keep); },
    signOut: function () { var s = sess; sess = null; store(null); if (s) fetch(CFG.url + '/auth/v1/logout', { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + s.access_token } }).catch(function () {}); },
    // calls a database function; auth=true sends the signed-in user's token
    rpc: function (name, args, auth) {
      if (!ok) return Promise.reject(new Error('not configured'));
      return (auth ? fresh() : Promise.resolve(null)).then(function (s) {
        if (auth && !s) { var e = new Error('signed out'); e.status = 401; throw e; }
        return req('/rest/v1/rpc/' + name, args || {}, auth);
      });
    }
  };
})();
