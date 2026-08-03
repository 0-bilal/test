/**
 * vmenu.js — محرّك العرض العمودي السينمائي  (1080 × 1920)
 * ───────────────────────────────────────────────────────────
 * • شريط أقسام قابل للنقر أعلى الشاشة للتنقّل بين الأقسام
 * • صورة المنتج في الوسط مع زرّي "السابق / التالي"
 * • أسامي منتجات القسم في صف أفقي واحد تحت الصورة
 * • الاسم بالعربي وتحته الإنجليزي بخط أصغر، ومقابله السعر والوصف
 * • تمرير تلقائي على المنتجات ثم انتقال ناعم للقسم التالي
 *
 * يعتمد على المتغيّرات العامة من products.js / main.js
 */

(function () {
  'use strict';

  /* ── إعدادات التوقيت ── */
  const VX_ITEM_MS  = 4500;   // مدة عرض كل منتج
  const VX_FADE_MS  = 400;    // اختفاء الأسامي عند تبديل القسم
  const VX_PAUSE_MS = 12000;  // مدة الإيقاف بعد تفاعل المستخدم

  /* ── الحالة ── */
  let _cats     = [];
  let _catIdx   = 0;
  let _prodIdx  = 0;
  let _timer    = null;
  let _pauseTmr = null;
  let _paused   = false;
  let _busy     = false;
  let _curImg   = '';
  let _imgLayer = 0;      // طبقة الصورة النشطة (0 أو 1)

  const $  = id => document.getElementById(id);
  const _t = (id, v) => { const e = $(id); if (e) e.textContent = v; };

  /* ════════════════════════════════════════════
     معلومات المطعم
  ════════════════════════════════════════════ */
  function _renderInfo() {
    const info = (typeof restaurantInfo !== 'undefined') ? restaurantInfo : {};

    const img = $('vx-logo-img'), ph = $('vx-logo-ph');
    if (info.logo && img) {
      img.src = info.logo;
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
      img.onerror = () => { img.style.display = 'none'; if (ph) ph.style.display = 'flex'; };
    }

    _t('vx-rest-ar',  info.nameAr    || '');
    _t('vx-rest-en',  info.nameEn    || '');
    _t('vx-rest-tag', info.taglineAr || '');
    _t('vl-phone-value', info.phone  || '');
    _t('vx-tax-text', info.taxNote   || '');
    _t('review-rest-name', info.nameAr || '');

    if (!info.googleMapsUrl || String(info.googleMapsUrl).includes('YOUR_LINK')) {
      const d = $('vl-discount-btn');
      if (d) d.style.display = 'none';
    }

    /* نقل overlay التقييم داخل الشاشة العمودية حتى يظهر فوقها */
    const scr = $('screen-vertical'), rev = $('review-overlay');
    if (scr && rev && rev.parentElement !== scr) scr.appendChild(rev);
  }

  /* ════════════════════════════════════════════
     بناء الأقسام (مع استبعاد المخفي من لوحة التحكم)
  ════════════════════════════════════════════ */
  function _buildCats() {
    _cats = [];
    if (typeof menuCategories === 'undefined') return;

    const hidden    = (typeof _devHiddenItems  !== 'undefined') ? _devHiddenItems  : new Set();
    const catSkip   = (typeof _devCatSkip      !== 'undefined') ? _devCatSkip      : new Set();
    const tempHide  = (typeof _devTempHide     !== 'undefined') ? _devTempHide     : {};
    const key       = (typeof _devItemKey === 'function') ? _devItemKey : (c, n) => c + '||' + n;
    const now       = Date.now();

    menuCategories.forEach(cat => {
      if (catSkip.has(cat.id)) return;   // تخطّى القسم كله
      const items = (cat.items || []).filter(it => {
        const k = key(cat.id, it.nameAr);
        return !hidden.has(k) && !(tempHide[k] && tempHide[k] > now);
      });
      if (!items.length) return;
      _cats.push({
        id: cat.id, nameAr: cat.nameAr, nameEn: cat.nameEn || '',
        icon: cat.icon || 'fa-utensils', items
      });
    });
  }

  /* ════════════════════════════════════════════
     شريط الأقسام
  ════════════════════════════════════════════ */
  function _renderTabs() {
    const bar = $('vx-cat-tabs');
    if (!bar) return;
    bar.innerHTML = '';

    _cats.forEach((cat, i) => {
      const b = document.createElement('button');
      b.className = 'vx-tab';
      b.innerHTML = `<i class="fa-solid ${cat.icon}"></i><span>${cat.nameAr}</span>`;
      b.addEventListener('click', () => { _pause(); _gotoCat(i); });
      bar.appendChild(b);
    });

    _fitTabs();
  }

  function _syncTabs() {
    const bar = $('vx-cat-tabs');
    if (!bar) return;
    const tabs = bar.querySelectorAll('.vx-tab');
    tabs.forEach((t, i) => t.classList.toggle('vx-tab-on', i === _catIdx));

  }

  /* ملاءمة أزرار الأقسام بحيث تظهر كلها دون تمرير */
  function _fitTabs() {
    const bar = $('vx-cat-tabs');
    if (!bar || !bar.children.length) return;

    const sizes = [
      { fs: 21, pad: 20, gap: 10 }, { fs: 20, pad: 18, gap: 9 },
      { fs: 19, pad: 16, gap: 8  }, { fs: 18, pad: 14, gap: 8 },
      { fs: 17, pad: 13, gap: 7  }, { fs: 16, pad: 12, gap: 6 },
      { fs: 15, pad: 11, gap: 6  }, { fs: 14, pad: 10, gap: 5 },
    ];

    const avail = bar.clientWidth;

    for (let i = 0; i < sizes.length; i++) {
      bar.style.setProperty('--vx-tab-fs',  sizes[i].fs  + 'px');
      bar.style.setProperty('--vx-tab-pad', sizes[i].pad + 'px');
      bar.style.setProperty('--vx-tab-gap', sizes[i].gap + 'px');

      let total = sizes[i].gap * (bar.children.length - 1);
      for (const c of bar.children) total += c.offsetWidth;

      if (total <= avail || i === sizes.length - 1) break;
    }
  }

  /* ════════════════════════════════════════════
     تصيير القسم: صف الأسامي
  ════════════════════════════════════════════ */
  function _renderCategory(idx) {
    const cat = _cats[idx];
    if (!cat) return;

    const row = $('vx-names');
    if (!row) return;
    row.innerHTML = '';

    cat.items.forEach((item, i) => {
      const el = document.createElement('span');
      el.className   = 'vx-name-chip';
      el.textContent = item.nameAr;
      el.addEventListener('click', () => { _pause(); _show(i); });
      row.appendChild(el);
    });

    _fitNames();
    _syncTabs();
  }

  /* ملاءمة حجم الخط بحيث تدخل كل الأسامي في صف أفقي واحد */
  function _fitNames() {
    const row = $('vx-names');
    if (!row || !row.children.length) return;

    const sizes = [
      { fs: 30, pad: 22 }, { fs: 28, pad: 20 }, { fs: 26, pad: 18 },
      { fs: 24, pad: 16 }, { fs: 22, pad: 14 }, { fs: 20, pad: 12 },
      { fs: 18, pad: 10 }, { fs: 16, pad: 9  }, { fs: 14, pad: 8 },
    ];

    const avail = row.clientWidth - 24;   // هامش أمان

    for (let i = 0; i < sizes.length; i++) {
      row.style.setProperty('--vx-chip-fs',  sizes[i].fs  + 'px');
      row.style.setProperty('--vx-chip-pad', sizes[i].pad + 'px');

      let total = 0;
      for (const c of row.children) total += c.offsetWidth;
      total += (row.children[0].offsetWidth || 0) * 0.26;  // تكبير الاسم النشط

      if (total <= avail || i === sizes.length - 1) break;
    }
  }

  /* ════════════════════════════════════════════
     عرض منتج بعينه
  ════════════════════════════════════════════ */
  function _show(pIdx, silent) {
    const cat = _cats[_catIdx];
    if (!cat || !cat.items.length) return;

    const n = cat.items.length;
    pIdx = ((pIdx % n) + n) % n;
    _prodIdx = pIdx;

    const item = cat.items[pIdx];
    if (!item) return;

    /* الأسامي */
    const chips = document.querySelectorAll('#vx-names .vx-name-chip');
    chips.forEach((c, i) => {
      c.classList.toggle('vx-on',   i === pIdx);
      c.classList.toggle('vx-done', i <  pIdx);
    });
    _moveUnderline(chips[pIdx]);

    /* الصورة */
    _setImage(item.image || '');

    /* الشارة */
    const bEl = $('vx-img-badge');
    if (bEl) {
      const bKey = (typeof _getBadge === 'function') ? _getBadge(cat.id, item.nameAr) : '';
      const meta = (typeof BADGE_META !== 'undefined') ? BADGE_META[bKey] : null;
      if (meta) {
        bEl.className = 'vx-img-badge on ' + meta.cls;
        bEl.innerHTML = `<i class="fa-solid ${meta.icon}"></i> ${meta.label}`;
      } else {
        bEl.className = 'vx-img-badge';
        bEl.innerHTML = '';
      }
    }

    /* التفاصيل — أنيميشن الدخول يُترك لانتقال القسم عند silent */
    const det = $('vx-details');
    if (det) {
      det.classList.remove('vx-swap');
      if (!silent) { void det.offsetWidth; det.classList.add('vx-swap'); }
    }

    _t('vx-name-ar', item.nameAr || '');

    /* النصوص تبقى دائماً في مكانها (ارتفاعات ثابتة) — تُفرَّغ فقط */
    _t('vx-name-en', (item.nameEn        || '').trim());
    _t('vx-desc',    (item.descriptionAr || '').trim());

    const cal = $('vx-cal');
    if (cal) {
      if (item.calories) {
        cal.classList.add('on');
        cal.innerHTML = `<i class="fa-solid fa-fire-flame-curved"></i> ${item.calories} سعرة حرارية`;
      } else cal.classList.remove('on');
    }

    const meal = $('vx-meal');
    if (meal) meal.classList.toggle('on', !!item.isMeal);

    const varWrap = $('vx-variants');
    if (varWrap) {
      const hiddenV = (typeof _devHiddenVariants !== 'undefined') ? _devHiddenVariants : new Set();
      const keyFn   = (typeof _devItemKey === 'function') ? _devItemKey : (c, nm) => c + '||' + nm;
      const list    = (item.variants || []).filter(v =>
        !hiddenV.has(keyFn(cat.id, item.nameAr) + '||' + v));
      varWrap.innerHTML = list.map(v => `<span class="vx-variant">${v}</span>`).join('');
    }

    /* المكونات (الفكرة الثالثة + الرابعة) */
    const ingEl = $('vx-ingredients');
    if (ingEl) {
      if (item.ingredients?.length) {
        ingEl.innerHTML = item.ingredients.map(ing => {
          if (ing.removable) {
            return `<span class="vx-ingredient vx-ingredient--removable" title="يمكن إزالته">
                      <i class="fa-solid fa-circle-minus"></i>${ing.nameAr}
                    </span>`;
          }
          return `<span class="vx-ingredient">${ing.nameAr}</span>`;
        }).join('');
        ingEl.style.display = 'flex';
      } else {
        ingEl.innerHTML = '';
        ingEl.style.display = 'none';
      }
    }

    /* اختيار الصوص */
    const saucePicker = $('vx-sauce-picker');
    const sauceBtns   = $('vx-sauce-btns');
    if (saucePicker && sauceBtns) {
      if (item.sauceOptions?.length) {
        sauceBtns.innerHTML = item.sauceOptions.map((s, i) =>
          `<button class="vx-sauce-btn${i === 0 ? ' vx-sauce-btn--on' : ''}"
                   onclick="this.parentElement.querySelectorAll('.vx-sauce-btn').forEach(b=>b.classList.remove('vx-sauce-btn--on'));this.classList.add('vx-sauce-btn--on')">
             ${s}
           </button>`
        ).join('');
        saucePicker.style.display = 'flex';
      } else {
        sauceBtns.innerHTML = '';
        saucePicker.style.display = 'none';
      }
    }

    const price = $('vx-price');
    if (price) {
      if (item.price != null && item.price !== '') {
        price.classList.remove('vx-hidden');
        _t('vx-price-num', String(item.price));
      } else price.classList.add('vx-hidden');
    }

    if (typeof _trackView === 'function') {
      try { _trackView(cat.id, item.nameAr); } catch (e) {}
    }
  }

  /* الخط الأحمر أسفل الاسم النشط */
  function _moveUnderline(chip) {
    const line = $('vx-underline');
    if (!line) return;
    if (!chip) { line.style.opacity = '0'; return; }

    const w = Math.max(40, chip.offsetWidth * 0.72);
    const x = chip.offsetLeft + (chip.offsetWidth - w) / 2;
    line.style.width     = w + 'px';
    line.style.transform = `translateX(${x}px)`;
    line.style.opacity   = '1';
  }

  /**
   * تبديل الصورة بتلاشٍ متقاطع بين طبقتين.
   * الصورة الجديدة تُحمَّل أولاً ثم تظهر فوق القديمة — بلا وميض أو فراغ.
   */
  function _setImage(src) {
    const layers = [$('vx-img'), $('vx-img2')];
    const ph = $('vx-img-ph');
    if (!layers[0] || !layers[1]) return;
    if (src === _curImg) return;
    _curImg = src;

    /* لا توجد صورة — أظهر البديل */
    if (!src) {
      layers.forEach(l => l.classList.remove('vx-img-on'));
      if (ph) ph.classList.add('on');
      return;
    }

    const next = layers[1 - _imgLayer];
    const cur  = layers[_imgLayer];

    const reveal = () => {
      if (_curImg !== src) return;          // تجاوزتها صورة أحدث
      if (ph) ph.classList.remove('on');
      next.classList.add('vx-img-on');
      cur.classList.remove('vx-img-on');
      _imgLayer = 1 - _imgLayer;
    };

    next.onload  = reveal;
    next.onerror = () => {
      if (_curImg !== src) return;
      layers.forEach(l => l.classList.remove('vx-img-on'));
      if (ph) ph.classList.add('on');
    };

    next.src = src;
    if (next.complete && next.naturalWidth) reveal();   // مخزّنة مسبقاً
  }

  /* ════════════════════════════════════════════
     المحرّك
  ════════════════════════════════════════════ */
  function _step() {
    if (_paused || _busy) return;
    const cat = _cats[_catIdx];
    if (!cat) return;

    const scrollSkip = (typeof _devScrollSkip !== 'undefined') ? _devScrollSkip : new Set();
    const keyFn      = (typeof _devItemKey === 'function') ? _devItemKey : (c, n) => c + '||' + n;

    // ابحث عن المنتج التالي غير المتخطَّى
    let nextIdx  = _prodIdx + 1;
    let attempts = 0;
    while (nextIdx < cat.items.length && attempts < cat.items.length) {
      if (!scrollSkip.has(keyFn(cat.id, cat.items[nextIdx].nameAr))) break;
      nextIdx++;
      attempts++;
    }

    if (nextIdx < cat.items.length) {
      _show(nextIdx);
      _timer = setTimeout(_step, VX_ITEM_MS);
    } else {
      _gotoCat((_catIdx + 1) % _cats.length);
    }
  }

  /**
   * الانتقال لقسم آخر: تختفي الأسامي والتفاصيل، ثم يدخل القسم الجديد.
   * @param {number} idx      رقم القسم
   * @param {number} startAt  المنتج الذي يبدأ منه (-1 = آخر منتج)
   */
  function _gotoCat(idx, startAt) {
    if (_busy || !_cats.length) return;

    /* نفس القسم (أو قسم واحد فقط) — أعِد العرض من أوّله دون انتقال */
    if (idx === _catIdx && startAt == null) {
      _show(0);
      clearTimeout(_timer);
      if (!_paused) _timer = setTimeout(_step, VX_ITEM_MS);
      return;
    }

    _busy = true;
    clearTimeout(_timer);

    const stage = $('vx-stage');

    /* 1) خروج: الصورة والأسامي والتفاصيل تنزلق وتتلاشى معاً */
    if (stage) {
      stage.classList.remove('vx-enter');
      stage.classList.add('vx-leaving');
    }

    setTimeout(() => {
      /* 2) تبديل المحتوى وهو مخفي */
      _catIdx = ((idx % _cats.length) + _cats.length) % _cats.length;
      _renderCategory(_catIdx);

      const last = _cats[_catIdx].items.length - 1;
      _show(startAt === -1 ? last : (startAt || 0), true);

      /* 3) دخول متتابع: صورة ← أسامي ← تفاصيل */
      if (stage) {
        stage.classList.remove('vx-leaving');
        void stage.offsetWidth;
        stage.classList.add('vx-enter');
      }

      _busy = false;
      clearTimeout(_timer);
      if (!_paused) _timer = setTimeout(_step, VX_ITEM_MS);
    }, VX_FADE_MS);
  }

  /* ════════════════════════════════════════════
     التنقّل اليدوي بين المنتجات
  ════════════════════════════════════════════ */
  function _next() {
    if (_busy) return;
    _pause();
    const cat = _cats[_catIdx];
    if (!cat) return;

    if (_prodIdx + 1 < cat.items.length) _show(_prodIdx + 1);
    else _gotoCat((_catIdx + 1) % _cats.length, 0);
  }

  function _prev() {
    if (_busy) return;
    _pause();
    if (_prodIdx - 1 >= 0) _show(_prodIdx - 1);
    else _gotoCat((_catIdx - 1 + _cats.length) % _cats.length, -1);
  }

  /* التنقّل اليدوي بين الأقسام */
  function _nextCat() {
    if (_busy || !_cats.length) return;
    _pause();
    _gotoCat((_catIdx + 1) % _cats.length, 0);
  }

  function _prevCat() {
    if (_busy || !_cats.length) return;
    _pause();
    _gotoCat((_catIdx - 1 + _cats.length) % _cats.length, 0);
  }

  /* ════════════════════════════════════════════
     إيقاف / استئناف
  ════════════════════════════════════════════ */
  function _pause() {
    if (_busy) return;
    clearTimeout(_pauseTmr);
    _pauseTmr = setTimeout(_resume, VX_PAUSE_MS);
    if (_paused) return;

    _paused = true;
    clearTimeout(_timer);
    const tag = $('vx-paused');
    if (tag) tag.classList.add('on');
  }

  function _resume() {
    clearTimeout(_pauseTmr);
    if (!_paused) return;
    _paused = false;

    const tag = $('vx-paused');
    if (tag) tag.classList.remove('on');

    if (_busy) return;
    _show(_prodIdx);
    clearTimeout(_timer);
    _timer = setTimeout(_step, VX_ITEM_MS);
  }

  /* ════════════════════════════════════════════
     البدء وإعادة البناء
  ════════════════════════════════════════════ */
  function _start() {
    clearTimeout(_timer);
    _busy = false;
    if (!_cats.length) return;

    _catIdx  = Math.min(_catIdx, _cats.length - 1);
    _prodIdx = 0;
    _renderTabs();
    _renderCategory(_catIdx);
    _show(0, true);

    const stage = $('vx-stage');
    if (stage) {
      stage.classList.remove('vx-leaving', 'vx-enter');
      void stage.offsetWidth;
      stage.classList.add('vx-enter');
    }

    if (!_paused) _timer = setTimeout(_step, VX_ITEM_MS);
  }

  function vxInit() {
    _renderInfo();
    if (typeof _loadBadges === 'function') _loadBadges();
    _buildCats();

    /* أزرار التنقّل بين المنتجات */
    const bNext = $('vx-nav-next'), bPrev = $('vx-nav-prev');
    if (bNext) bNext.addEventListener('click', _next);
    if (bPrev) bPrev.addEventListener('click', _prev);

    /* إيقاف تلقائي عند لمس المسرح */
    const stage = $('vx-stage');
    if (stage) {
      ['touchstart', 'wheel'].forEach(ev =>
        stage.addEventListener(ev, _pause, { passive: true }));
    }

    setTimeout(_start, 700);
  }

  function vxRebuild() {
    const scr = $('screen-vertical');
    if (!scr || scr.style.display === 'none') return;
    clearTimeout(_timer);
    _buildCats();
    _start();
  }

  /* ── التصدير ── */
  window._vxInit    = vxInit;
  window._vxRebuild = vxRebuild;
  window._vxPause   = _pause;
  window._vxResume  = _resume;
  window._vxNext    = _next;
  window._vxPrev    = _prev;
  window._vxNextCat = _nextCat;
  window._vxPrevCat = _prevCat;
})();
