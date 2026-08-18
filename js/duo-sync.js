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

  return { write, listen, readOnce, writeAction, onAction, init: _init, enabled };
})();
