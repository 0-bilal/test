/**
 * duo-sync.js — مزامنة إعدادات الإظهار/الإخفاء بين الجهازين عبر Firebase
 * ────────────────────────────────────────────────────────────────────────
 * عند تغيير أي إعداد (منتج، شريحة، خيار، زر خصم/هاتف/ألعاب، شارة) في لوحة
 * تحكم أحد الجهازين، يُكتب في Firebase تحت مسار الفرع، فتتحدّث شاشة المنيو
 * على الجهاز الآخر فوراً — دون الحاجة لضبط كل جهاز على حدة.
 *
 * الاستخدام:
 *   DuoSync.write(settings)        — لوحة التحكم / الكاشير تكتب الإعدادات عند التغيير
 *   DuoSync.listen(cb)             — المنيو يستمع للتغييرات ويطبّقها
 *   DuoSync.readOnce(cb)           — قراءة الإعدادات الحالية مرة واحدة
 *   DuoSync.writeAction(action)    — الكاشير يرسل أمر فوري (إظهار منتج، لعبة…)
 *   DuoSync.onAction(cb, sinceTs)  — المنيو يستمع للأوامر الفورية من الكاشير
 *
 * يعتمد على Firebase compat SDK + duo-config.js المحمّلَين قبله.
 */
window.DuoSync = (function () {
  'use strict';

  const fbConfig = window.DUO_FIREBASE_CONFIG || null;

  function branch()  { return (localStorage.getItem('duo_pair_branch') || 'Branch01').trim() || 'Branch01'; }
  function enabled() { return localStorage.getItem('duo_pair_enabled') === 'true'; }

  let db = null, ready = false;

  function _init() {
    if (ready && db) return true;
    if (typeof firebase === 'undefined' || !firebase.database) return false;
    if (!fbConfig || !fbConfig.databaseURL) return false;
    try {
      const apps = firebase.apps || [];
      // أعِد استخدام تطبيق duo-connect إن وُجد، وإلا أنشئ تطبيقاً خاصاً
      const app = apps.find(a => a && a.name === 'duoApp')
               || apps.find(a => a && a.name === 'duoSync')
               || firebase.initializeApp(fbConfig, 'duoSync');
      db = firebase.database(app);
      ready = true;
    } catch (e) {
      console.warn('[DuoSync] init error:', e);
      return false;
    }
    return true;
  }

  function _ref() { return db.ref(`duo/${branch()}/settings`); }

  function write(settings) {
    if (!enabled() || !_init()) return;
    try { _ref().set(Object.assign({ ts: Date.now() }, settings)); }
    catch (e) { console.warn('[DuoSync] write error:', e); }
  }

  function listen(cb) {
    if (!enabled() || !_init()) return;
    try { _ref().on('value', s => { const v = s.val(); if (v) cb(v); }); }
    catch (e) { console.warn('[DuoSync] listen error:', e); }
  }

  function readOnce(cb) {
    if (!enabled() || !_init()) { cb(null); return; }
    try { _ref().once('value').then(s => cb(s.val())).catch(() => cb(null)); }
    catch (e) { cb(null); }
  }

  /* ── مسار أوامر الكاشير الفورية (منفصل عن الإعدادات) ── */
  function _actionRef() {
    if (!db) return null;
    return db.ref(`duo/${branch()}/cashier-action`);
  }

  /**
   * يرسل أمراً فورياً من شاشة الكاشير (showProduct، launchGame…)
   * يُضاف إليه طابع زمني ts لضمان عدم تنفيذ أوامر قديمة.
   */
  function writeAction(action) {
    if (!_init()) return false;
    try {
      const ref = _actionRef();
      if (!ref) return false;
      ref.set(Object.assign({ ts: Date.now() }, action));
      return true;
    } catch (e) { console.warn('[DuoSync] writeAction error:', e); return false; }
  }

  /**
   * يستمع لأوامر الكاشير الفورية على شاشة المنيو.
   * sinceTs: يتجاهل الأوامر القديمة قبل وقت بدء الصفحة.
   */
  function onAction(cb, sinceTs) {
    if (!_init()) return;
    const _since = sinceTs || Date.now();
    try {
      const ref = _actionRef();
      if (!ref) return;
      ref.on('value', s => {
        const v = s.val();
        if (v && v.ts && v.ts > _since) cb(v);
      });
    } catch (e) { console.warn('[DuoSync] onAction error:', e); }
  }

  /* ══════════════════════════════════════════════════════════════
     أجهزة العملاء المتصلة — حضور + بطارية + اسم قابل للتعديل
     المسار: duo/{branch}/devices/{devId}
     { name, platform, netType, battery, batteryCharging, online, ts }

     الاستقرار: نراقب duo`.info/connected` باستمرار (مثل duo-connect.js
     تماماً) — في كل مرة يعود الاتصال بفايربيس (بعد انقطاع شبكة، أو رجوع
     الآيباد من وضع السكون) نُعيد كتابة الحضور **ونعيد تسجيل** onDisconnect
     من جديد. تسجيله لمرة واحدة فقط عند فتح الصفحة غير كافٍ: onDisconnect
     يرتبط باتصال (socket) معيّن، فبعد أي انقطاع واتصال جديد يجب إعادة
     ضبطه وإلا لن يعمل بشكل صحيح في المرة التالية، وقد تبقى الشاشة تظهر
     "غير متصل" أو العكس رغم أنها تعمل فعلياً.
  ══════════════════════════════════════════════════════════════ */
  let _presRef     = null;   // مرجع عقدة هذا الجهاز
  let _presConnRef = null;   // مرجع .info/connected
  let _presInfo    = {};     // آخر بيانات معروفة (منصّة/شبكة/بطارية)
  let _presName    = null;   // الاسم بعد تحديده أول مرة — يُعاد استخدامه دائماً

  function _devicesRef() { return db.ref(`duo/${branch()}/devices`); }

  /** يكتب حالة الحضور الحالية ويُعيد ضبط onDisconnect — يُستدعى عند كل اتصال/إعادة اتصال */
  function _presWrite() {
    if (!_presRef) return;
    const payload = Object.assign({
      platform:        _presInfo.platform || '—',
      netType:         _presInfo.netType  || '—',
      battery:         (_presInfo.battery === undefined ? null : _presInfo.battery),
      batteryCharging: !!_presInfo.batteryCharging,
      online:          true,
      ts:              firebase.database.ServerValue.TIMESTAMP,
    }, _presName ? { name: _presName } : {});
    _presRef.update(payload).catch(() => {});
    try {
      _presRef.onDisconnect().update({ online: false, ts: firebase.database.ServerValue.TIMESTAMP });
    } catch (e) {}
  }

  /** يحدّد اسماً تسلسلياً فريداً أول مرة فقط (أو يعيد استخدام اسم محفوظ سلفاً) ثم يكتب */
  function _presAssignNameThenWrite() {
    _presRef.once('value').then(snap => {
      const v = snap.val();
      if (v && v.name) { _presName = v.name; _presWrite(); return; }
      db.ref(`duo/${branch()}/deviceSeq`).transaction(cur => (cur || 0) + 1)
        .then(res => {
          const n = (res && res.committed && res.snapshot) ? res.snapshot.val() : null;
          _presName = n ? `شاشة ${n}` : 'شاشة العميل';
          _presWrite();
        })
        .catch(() => { _presName = _presName || 'شاشة العميل'; _presWrite(); });
    }).catch(() => { _presName = _presName || 'شاشة العميل'; _presWrite(); });
  }

  /**
   * يسجّل حضور هذا الجهاز (شاشة عميل) في Firebase ويراقب اتصاله باستمرار.
   */
  function presenceStart(devId, info) {
    if (!enabled() || !_init() || !devId) return;
    _presInfo = info || {};
    _presRef  = db.ref(`duo/${branch()}/devices/${devId}`);

    if (_presConnRef) { try { _presConnRef.off(); } catch (e) {} }
    _presConnRef = db.ref('.info/connected');
    _presConnRef.on('value', snap => {
      if (snap.val() !== true) return;   // انقطاع — onDisconnect المسجَّل سابقاً يتكفّل بالتحديث
      if (_presName) _presWrite();               // لدينا اسم بالفعل — أعِد الكتابة وأعِد ضبط onDisconnect
      else            _presAssignNameThenWrite(); // أول اتصال — حدّد الاسم أولاً
    });
  }

  /** تحديث دوري لبيانات الجهاز (بطارية، شبكة…) — يحافظ دائماً على الاسم حتى لو حُذفت العقدة */
  function presenceUpdate(partial) {
    if (!_presRef) return;
    _presInfo = Object.assign({}, _presInfo, partial);
    const payload = Object.assign({}, partial, { ts: firebase.database.ServerValue.TIMESTAMP });
    if (_presName) payload.name = _presName;
    try { _presRef.update(payload).catch(() => {}); } catch (e) {}
  }

  /* استرجاع سريع عند رجوع التبويب للواجهة أو رجوع الشبكة — لا ننتظر
     اكتشاف فايربيس التلقائي للانقطاع، بل نُعيد الكتابة فوراً */
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { if (_presRef) _presWrite(); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && _presRef) _presWrite();
    });
  }

  /** الكاشير: يستمع لقائمة الأجهزة المتصلة بهذا الفرع */
  function watchDevices(cb) {
    if (!enabled() || !_init()) return;
    try {
      _devicesRef().on('value', snap => {
        const v = snap.val() || {};
        const arr = Object.keys(v).map(k => Object.assign({ devId: k }, v[k]));
        cb(arr);
      });
    } catch (e) { console.warn('[DuoSync] watchDevices error:', e); }
  }

  /** الكاشير: إعادة تسمية جهاز */
  function renameDevice(devId, name) {
    if (!enabled() || !_init() || !devId) return;
    try { db.ref(`duo/${branch()}/devices/${devId}`).update({ name }).catch(() => {}); }
    catch (e) {}
  }

  /** الكاشير: إزالة جهاز من القائمة (فصل نهائي) */
  function removeDevice(devId) {
    if (!enabled() || !_init() || !devId) return;
    try { db.ref(`duo/${branch()}/devices/${devId}`).remove().catch(() => {}); }
    catch (e) {}
  }

  /**
   * تحديث حقول مخصّصة على عقدة جهاز معيّن دون المساس بباقي بياناته
   * (تُستخدم مثلاً من لوحة التحكم/الكاشير لضبط ميزات خاصة بجهاز واحد فقط،
   * كصورة "منتجات جديدة" التي قد تُفعَّل على جهاز وتُخفى عن آخر).
   */
  function setDeviceFlag(devId, patch) {
    if (!enabled() || !_init() || !devId || !patch) return;
    try {
      db.ref(`duo/${branch()}/devices/${devId}`)
        .update(Object.assign({}, patch, { ts: firebase.database.ServerValue.TIMESTAMP }))
        .catch(() => {});
    } catch (e) { console.warn('[DuoSync] setDeviceFlag error:', e); }
  }

  /** يستمع فقط لعقدة جهاز واحد — تستخدمه شاشة المنيو لمراقبة إعداداتها الخاصة */
  function watchDevice(devId, cb) {
    if (!enabled() || !_init() || !devId) return;
    try {
      db.ref(`duo/${branch()}/devices/${devId}`).on('value', s => cb(s.val() || {}));
    } catch (e) { console.warn('[DuoSync] watchDevice error:', e); }
  }

  return {
    write, listen, readOnce, writeAction, onAction, init: _init, enabled,
    presenceStart, presenceUpdate, watchDevices, renameDevice, removeDevice,
    setDeviceFlag, watchDevice,
  };
})();
