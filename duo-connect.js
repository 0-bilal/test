/**
 * duo-connect.js — الربط الثابت التلقائي بين جهازَي iPad عبر WebRTC (PeerJS)
 * ────────────────────────────────────────────────────────────────────────
 * • إعداد لمرة واحدة من لوحة التحكم (معرّف الفرع + دور الجهاز يسار/يمين).
 * • كل جهاز يحصل على Peer ID ثابت: iPad-Left-<Branch> / iPad-Right-<Branch>.
 * • عند فتح المنيو على الجهازين يتصلان تلقائياً عبر شبكة الـ Wi-Fi المحلية،
 *   بدون أي تدخّل من العميل (لا غرف ولا QR).
 * • إعادة اتصال تلقائية عند انقطاع الشبكة.
 *
 * واجهة برمجية للألعاب لاحقاً:
 *   DuoConnect.send({ ... })          → إرسال بيانات للجهاز الآخر
 *   DuoConnect.onData(fn)             → استقبال البيانات
 *   DuoConnect.onStatus(fn)          → متابعة حالة الاتصال
 *   DuoConnect.status()               → الحالة الحالية { state, myId, peerId }
 *   DuoConnect.reconnect()            → إعادة المحاولة يدوياً
 *
 * ملاحظة: يعتمد على مكتبة PeerJS المحمّلة قبله في الصفحة.
 */
(function () {
  'use strict';

  /* ── مفاتيح التخزين (مشتركة مع لوحة التحكم) ── */
  const LS = {
    branch:  'duo_pair_branch',
    role:    'duo_pair_role',      // 'left' | 'right'
    enabled: 'duo_pair_enabled',   // 'true' | 'false'
    server:  'duo_pair_server',    // JSON اختياري لخادم PeerJS محلي
    status:  'duo_conn_status',     // مرآة الحالة لعرضها في لوحة التحكم
  };

  const RETRY_MS      = 4000;   // إعادة محاولة الاتصال
  const HEARTBEAT_MS  = 15000;  // نبضة للتأكد من بقاء الاتصال حياً

  /* ── قراءة الإعداد ── */
  function readConfig() {
    let server = null;
    try { server = JSON.parse(localStorage.getItem(LS.server) || 'null'); } catch (e) { server = null; }
    return {
      branch:  (localStorage.getItem(LS.branch)  || '').trim(),
      role:    (localStorage.getItem(LS.role)    || '').trim(),   // 'left' | 'right'
      enabled: localStorage.getItem(LS.enabled) === 'true',
      server:  server,
    };
  }

  /* ── توليد المعرّفات الثابتة ── */
  function makePeerId(role, branch) {
    const r = role === 'left' ? 'Left' : 'Right';
    return `iPad-${r}-${branch}`;
  }
  function partnerRole(role) { return role === 'left' ? 'right' : 'left'; }

  /* ── الحالة الداخلية ── */
  let peer        = null;
  let conn        = null;
  let retryTimer  = null;
  let heartbeat   = null;
  let myId        = '';
  let peerId      = '';
  let cfg         = null;

  let _state = 'idle';   // idle | offline | connecting | waiting | connected | error
  const statusListeners = [];
  const dataListeners    = [];

  /* ── نشر تغيّر الحالة ── */
  function setState(state, extra) {
    _state = state;
    const payload = Object.assign({ state, myId, peerId, ts: Date.now() }, extra || {});
    // مرآة في localStorage لتعرضها لوحة التحكم (صفحة أخرى)
    try { localStorage.setItem(LS.status, JSON.stringify(payload)); } catch (e) {}
    statusListeners.forEach(fn => { try { fn(payload); } catch (e) {} });
    _renderBadge(payload);
  }

  /* ── واجهة برمجية عامة ── */
  const api = {
    send(obj) {
      if (conn && conn.open) { try { conn.send(obj); return true; } catch (e) { return false; } }
      return false;
    },
    onData(fn)   { if (typeof fn === 'function') dataListeners.push(fn); },
    onStatus(fn) { if (typeof fn === 'function') { statusListeners.push(fn); fn({ state: _state, myId, peerId, ts: Date.now() }); } },
    status()     { return { state: _state, myId, peerId }; },
    reconnect()  { _teardown(); start(); },
    ids()        { return { myId, peerId }; },
  };
  window.DuoConnect = api;

  /* ════════════════════════════════════════════════════
     الاتصال
  ════════════════════════════════════════════════════ */
  function start() {
    cfg = readConfig();

    // غير مُفعّل أو غير مُعدّ → لا شيء
    if (!cfg.enabled || !cfg.branch || (cfg.role !== 'left' && cfg.role !== 'right')) {
      setState('idle');
      return;
    }
    // مكتبة PeerJS غير محمّلة
    if (typeof Peer === 'undefined') {
      console.warn('[DuoConnect] PeerJS غير محمّلة.');
      setState('error', { error: 'peerjs-missing' });
      return;
    }

    myId   = makePeerId(cfg.role, cfg.branch);
    peerId = makePeerId(partnerRole(cfg.role), cfg.branch);

    setState('connecting');

    // خيارات الخادم (افتراضياً سحابة PeerJS العامة، أو خادم محلي إن حُدِّد)
    // خوادم STUN لاكتشاف المسار بين الجهازين عبر الشبكة المحلية
    const opts = {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    };
    if (cfg.server && cfg.server.host) {
      opts.host   = cfg.server.host;
      opts.port   = cfg.server.port ? Number(cfg.server.port) : 443;
      opts.path   = cfg.server.path || '/';
      opts.secure = !!cfg.server.secure;
      if (cfg.server.key) opts.key = cfg.server.key;
    }

    try {
      peer = new Peer(myId, opts);
    } catch (e) {
      console.warn('[DuoConnect] فشل إنشاء Peer:', e);
      setState('error', { error: String(e) });
      scheduleRetry();
      return;
    }

    peer.on('open', id => {
      console.log('[DuoConnect] جاهز بالمعرّف:', id);
      // جهاز "اليسار" هو من يبدأ الاتصال؛ "اليمين" يستمع فقط
      if (cfg.role === 'left') {
        tryConnect();
      } else {
        setState('waiting');
      }
    });

    // استقبال اتصال وارد (على جهاز اليمين، أو أي طرف)
    peer.on('connection', incoming => {
      console.log('[DuoConnect] اتصال وارد من', incoming.peer);
      bindConnection(incoming);
    });

    peer.on('disconnected', () => {
      console.warn('[DuoConnect] انفصال عن الوسيط — إعادة اتصال…');
      setState('connecting');
      try { peer.reconnect(); } catch (e) { scheduleRetry(); }
    });

    peer.on('error', err => {
      const type = err && err.type ? err.type : 'unknown';
      console.warn('[DuoConnect] خطأ:', type, err);
      switch (type) {
        case 'peer-unavailable':
          // الشريك لم يفتح المنيو بعد — أعِد المحاولة بهدوء
          setState('connecting', { detail: 'الشريك لم يفتح المنيو بعد' });
          scheduleRetry();
          break;
        case 'unavailable-id':
          setState('error', { detail: 'المعرّف مستخدم — أغلق أي تبويب آخر للمنيو على هذا الجهاز' });
          break;
        case 'network':
        case 'server-error':
        case 'socket-error':
        case 'socket-closed':
          setState('error', { detail: 'تعذّر الوصول لخادم الإشارة — تحقّق من اتصال الإنترنت' });
          scheduleRetry();
          break;
        case 'browser-incompatible':
          setState('error', { detail: 'المتصفح لا يدعم WebRTC' });
          break;
        default:
          setState('error', { detail: 'خطأ: ' + type });
          scheduleRetry();
      }
    });
  }

  function tryConnect() {
    if (!peer || peer.destroyed) return;
    if (conn && conn.open) return;
    setState('connecting');
    try {
      const c = peer.connect(peerId, { reliable: true, serialization: 'json' });
      bindConnection(c);
    } catch (e) {
      scheduleRetry();
    }
  }

  function bindConnection(c) {
    // إن وُجد اتصال قديم مفتوح، احتفظ بالأحدث فقط
    conn = c;

    c.on('open', () => {
      console.log('[DuoConnect] ✅ متصل بـ', c.peer);
      clearTimeout(retryTimer);
      setState('connected');
      startHeartbeat();
    });

    c.on('data', data => {
      // نبضة داخلية — تجاهلها
      if (data && data.__duo === 'ping') { api.send({ __duo: 'pong' }); return; }
      if (data && data.__duo === 'pong') return;
      dataListeners.forEach(fn => { try { fn(data); } catch (e) {} });
    });

    c.on('close', () => {
      console.warn('[DuoConnect] أُغلق الاتصال.');
      stopHeartbeat();
      if (conn === c) conn = null;
      // اليسار يعيد المحاولة؛ اليمين يعود للانتظار
      if (cfg && cfg.role === 'left') { setState('connecting'); scheduleRetry(); }
      else setState('waiting');
    });

    c.on('error', err => {
      console.warn('[DuoConnect] خطأ اتصال:', err);
      stopHeartbeat();
      if (conn === c) conn = null;
      scheduleRetry();
    });
  }

  function scheduleRetry() {
    if (!cfg || !cfg.enabled) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (cfg.role === 'left') tryConnect();
    }, RETRY_MS);
  }

  /* نبضة تُبقي الاتصال حياً وتكتشف الانقطاع الصامت */
  function startHeartbeat() {
    stopHeartbeat();
    heartbeat = setInterval(() => { api.send({ __duo: 'ping' }); }, HEARTBEAT_MS);
  }
  function stopHeartbeat() { if (heartbeat) { clearInterval(heartbeat); heartbeat = null; } }

  function _teardown() {
    clearTimeout(retryTimer);
    stopHeartbeat();
    try { if (conn) conn.close(); } catch (e) {}
    try { if (peer) peer.destroy(); } catch (e) {}
    conn = null; peer = null;
  }

  /* ════════════════════════════════════════════════════
     مؤشر حالة صغير (اختياري) — أسفل يسار الشاشة
  ════════════════════════════════════════════════════ */
  let _badge = null;
  function _renderBadge(payload) {
    if (!cfg || !cfg.enabled) { if (_badge) _badge.style.display = 'none'; return; }
    if (!_badge) {
      _badge = document.createElement('div');
      _badge.id = 'duo-conn-badge';
      Object.assign(_badge.style, {
        position: 'fixed', bottom: '10px', left: '10px', zIndex: '99998',
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '6px 12px', borderRadius: '100px',
        background: 'rgba(10,0,2,.82)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,.14)',
        font: "600 12px 'Tajawal',sans-serif", color: '#fff',
        pointerEvents: 'none', direction: 'rtl',
      });
      document.body.appendChild(_badge);
    }
    const map = {
      connected:  { c: '#22c55e', t: 'مرتبط' },
      connecting: { c: '#f5c200', t: 'جارٍ الاتصال…' },
      waiting:    { c: '#3b82f6', t: 'بانتظار الشريك' },
      offline:    { c: '#f87171', t: 'غير متصل' },
      error:      { c: '#f87171', t: 'خطأ اتصال' },
      idle:       { c: '#888',    t: 'الربط متوقف' },
    };
    const m = map[payload.state] || map.idle;
    const label = payload.detail ? `${m.t} — ${payload.detail}` : m.t;
    _badge.style.display = 'flex';
    _badge.style.maxWidth = '60vw';
    _badge.innerHTML =
      `<span style="width:9px;height:9px;border-radius:50%;background:${m.c};box-shadow:0 0 8px ${m.c};flex-shrink:0"></span>` +
      `<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</span>`;
  }

  /* ════════════════════════════════════════════════════
     تشغيل تلقائي عند تحميل الصفحة
  ════════════════════════════════════════════════════ */
  // إعادة الاتصال عند عودة الشبكة / عودة الصفحة للواجهة
  window.addEventListener('online',  () => { if (cfg && cfg.enabled) api.reconnect(); });
  window.addEventListener('offline', () => setState('offline'));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && cfg && cfg.enabled && _state !== 'connected') api.reconnect();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
