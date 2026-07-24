/**
 * duo-connect.js — الربط بين جهازَي iPad عبر Firebase Realtime Database
 * ────────────────────────────────────────────────────────────────────────
 * • تمرير موثوق عبر خدمة Firebase المجانية (بدون خادم محلي).
 * • يعمل مع GitHub Pages (HTTPS) وحتى مع راوترات تعزل الأجهزة.
 * • إعداد لمرة واحدة من لوحة التحكم: معرّف الفرع + الدور + إعداد Firebase.
 * • عند فتح المنيو على الجهازين يتصلان تلقائياً بدون أي تدخّل من العميل.
 *
 * واجهة برمجية للألعاب (لم تتغيّر):
 *   DuoConnect.send({ ... })   → إرسال حدث للجهاز الآخر
 *   DuoConnect.onData(fn)      → استقبال الأحداث
 *   DuoConnect.onStatus(fn)    → متابعة حالة الاتصال
 *   DuoConnect.status()        → الحالة الحالية
 *   DuoConnect.reconnect()     → إعادة المحاولة يدوياً
 *
 * يعتمد على Firebase compat SDK المحمّل قبله (app + database).
 */
(function () {
  'use strict';

  const LS = {
    branch:  'duo_pair_branch',
    role:    'duo_pair_role',     // 'left' | 'right'
    enabled: 'duo_pair_enabled',  // 'true' | 'false'
    fb:      'duo_fb_config',      // إعداد مشروع Firebase (JSON)
    status:  'duo_conn_status',    // مرآة الحالة للوحة التحكم
  };

  function readConfig() {
    let fb = null;
    try { fb = JSON.parse(localStorage.getItem(LS.fb) || 'null'); } catch (e) { fb = null; }
    // احتياطي: الإعداد المضمّن في duo-config.js (لا حاجة للصقه على الأجهزة)
    if ((!fb || !fb.databaseURL) && window.DUO_FIREBASE_CONFIG) fb = window.DUO_FIREBASE_CONFIG;
    return {
      branch:  (localStorage.getItem(LS.branch)  || '').trim(),
      role:    (localStorage.getItem(LS.role)    || '').trim(),
      enabled: localStorage.getItem(LS.enabled) === 'true',
      fb:      fb,
    };
  }
  const partnerRole = r => (r === 'left' ? 'right' : 'left');

  /* ── الحالة الداخلية ── */
  let app = null, db = null, cfg = null;
  let myRole = '', peerRole = '';
  let connRef = null, presMineRef = null, presPeerRef = null, outMineRef = null, outPeerRef = null;
  let fbConnected = false, peerOnline = false;
  let _state = 'idle';
  const statusListeners = [];
  const dataListeners    = [];

  function setState(state, extra) {
    _state = state;
    const payload = Object.assign({
      state,
      myId:   (cfg && cfg.branch && myRole)   ? `${cfg.branch}/${myRole}`   : '',
      peerId: (cfg && cfg.branch && peerRole) ? `${cfg.branch}/${peerRole}` : '',
      ts: Date.now(),
    }, extra || {});
    try { localStorage.setItem(LS.status, JSON.stringify(payload)); } catch (e) {}
    statusListeners.forEach(fn => { try { fn(payload); } catch (e) {} });
    _renderBadge(payload);
  }

  function recompute() {
    if (!fbConnected) { setState('offline', { detail: 'لا يوجد اتصال بالإنترنت / Firebase' }); return; }
    if (peerOnline)   { setState('connected'); }
    else              { setState('waiting', { detail: 'الجهاز الشريك غير متصل بعد' }); }
  }

  /* ── واجهة برمجية عامة ── */
  const api = {
    send(obj) {
      if (!outMineRef) return false;
      try { outMineRef.push({ d: obj, t: Date.now() }); return true; } catch (e) { return false; }
    },
    onData(fn)   { if (typeof fn === 'function') dataListeners.push(fn); },
    onStatus(fn) { if (typeof fn === 'function') { statusListeners.push(fn); fn({ state: _state, ts: Date.now() }); } },
    status()     { return { state: _state, myId: myRole, peerId: peerRole }; },
    reconnect()  { _detach(); start(); },
    ids()        { return { myId: myRole, peerId: peerRole }; },
  };
  window.DuoConnect = api;

  /* ════════════════════════════════════════════════════
     البدء
  ════════════════════════════════════════════════════ */
  function start() {
    cfg = readConfig();

    if (!cfg.enabled || !cfg.branch || (cfg.role !== 'left' && cfg.role !== 'right')) {
      setState('idle'); return;
    }
    if (typeof firebase === 'undefined' || !firebase.database) {
      setState('error', { detail: 'مكتبة Firebase غير محمّلة (تحقّق من الإنترنت)' }); return;
    }
    if (!cfg.fb || !cfg.fb.databaseURL) {
      setState('error', { detail: 'إعداد Firebase ناقص — أدخله في لوحة التحكم' }); return;
    }

    myRole   = cfg.role;
    peerRole = partnerRole(cfg.role);
    setState('connecting');

    try {
      app = (firebase.apps || []).find(a => a && a.name === 'duoApp')
            || firebase.initializeApp(cfg.fb, 'duoApp');
      db  = firebase.database(app);
    } catch (e) {
      console.warn('[DuoConnect] فشل تهيئة Firebase:', e);
      setState('error', { detail: 'فشل تهيئة Firebase' });
      return;
    }

    const base   = `duo/${cfg.branch}`;
    presMineRef  = db.ref(`${base}/presence/${myRole}`);
    presPeerRef  = db.ref(`${base}/presence/${peerRole}`);
    outMineRef   = db.ref(`${base}/out/${myRole}`);
    outPeerRef   = db.ref(`${base}/out/${peerRole}`);
    connRef      = db.ref('.info/connected');

    // نظّف صندوق الخروج القديم لهذا الجهاز (رسائل جلسة سابقة)
    outMineRef.remove().catch(() => {});

    // مراقبة اتصال Firebase + إعلان الحضور
    connRef.on('value', snap => {
      fbConnected = snap.val() === true;
      if (fbConnected) {
        try {
          presMineRef.onDisconnect().set({ online: false, ts: firebase.database.ServerValue.TIMESTAMP });
          presMineRef.set({ online: true, ts: firebase.database.ServerValue.TIMESTAMP });
        } catch (e) {}
      }
      recompute();
    });

    // مراقبة حضور الشريك
    presPeerRef.on('value', snap => {
      const v = snap.val();
      peerOnline = !!(v && v.online);
      recompute();
    });

    // استقبال رسائل الشريك (ثم حذفها لإبقاء القائمة صغيرة)
    outPeerRef.on('child_added', snap => {
      const v = snap.val();
      if (v && v.d !== undefined) {
        if (v.d && v.d.__duo) return; // رسائل داخلية
        dataListeners.forEach(fn => { try { fn(v.d); } catch (e) {} });
      }
      snap.ref.remove().catch(() => {});
    });
  }

  function _detach() {
    try { if (connRef)     connRef.off(); } catch (e) {}
    try { if (presPeerRef) presPeerRef.off(); } catch (e) {}
    try { if (outPeerRef)  outPeerRef.off(); } catch (e) {}
    try { if (presMineRef) presMineRef.set({ online: false, ts: Date.now() }); } catch (e) {}
    connRef = presPeerRef = outPeerRef = null;
    fbConnected = false; peerOnline = false;
  }

  /* ════════════════════════════════════════════════════
     مؤشر حالة مصغّر — بجانب البطارية في الفوتر
     كلمة واحدة لكل حالة
  ════════════════════════════════════════════════════ */
  function _renderBadge(payload) {
    const mini = document.getElementById('duo-conn-mini');
    const sep  = document.getElementById('conn-sep');
    if (!mini) return;

    // أخفِ عند التوقّف / عدم التفعيل
    if (!cfg || !cfg.enabled || payload.state === 'idle') {
      mini.style.display = 'none';
      if (sep) sep.style.display = 'none';
      return;
    }

    const map = {
      connected:  { c: '#22c55e', t: 'مرتبط' },
      connecting: { c: '#f5c200', t: 'يتصل' },
      waiting:    { c: '#3b82f6', t: 'انتظار' },
      offline:    { c: '#f87171', t: 'منقطع' },
      error:      { c: '#f87171', t: 'خطأ' },
    };
    const m = map[payload.state] || map.offline;

    const dot = mini.querySelector('.dcm-dot');
    const lbl = mini.querySelector('.dcm-label');
    if (dot) { dot.style.background = m.c; dot.style.boxShadow = `0 0 6px ${m.c}`; }
    if (lbl) { lbl.textContent = m.t; lbl.style.color = m.c; }

    mini.style.display = 'flex';
    if (sep) sep.style.display = '';
  }

  /* ════════════════════════════════════════════════════
     تشغيل تلقائي
  ════════════════════════════════════════════════════ */
  window.addEventListener('online',  () => { if (cfg && cfg.enabled) api.reconnect(); });
  window.addEventListener('offline', () => setState('offline', { detail: 'انقطع الإنترنت' }));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && cfg && cfg.enabled && _state !== 'connected') api.reconnect();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
