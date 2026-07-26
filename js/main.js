/**
 * main.js — Burger House Digital Menu
 * - All categories rendered in ONE scrollable page
 * - Category tabs → scroll to section anchor
 * - Auto-scroll: item by item across ALL categories (loops)
 * - FAB: social always visible; phone & hours toggle on tap
 */

/* ══ منع الزوم بالأصبعين (Pinch-to-Zoom) ══ */
document.addEventListener('touchmove', e => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

document.addEventListener('gesturestart',  e => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
document.addEventListener('gestureend',    e => e.preventDefault(), { passive: false });
/* ══════════════════════════════════════════ */

/* ── Config ── */
const ITEM_DURATION   = 3500;  // ms per highlight step
const HIGHLIGHT_DELAY = 80;    // ms to let CSS layout settle before centering
const PAUSE_DURATION  = 12000; // ms to pause auto-scroll after user interaction

/* ── Helpers ── */
const $ = id => document.getElementById(id);
const setText = (id, v) => { const e=$(id); if(e) e.textContent=v; };

/* ════════════════════════════════════════════════════════
   RESTAURANT INFO
════════════════════════════════════════════════════════ */
function renderRestaurantInfo() {
  setText('rest-name-ar',    restaurantInfo.nameAr);
  setText('rest-name-en',    restaurantInfo.nameEn);
  setText('rest-tagline',    restaurantInfo.taglineAr);
  setText('review-rest-name', restaurantInfo.nameAr);

  // Logo
  const logoImg = $('logo-img'), logoEl = $('logo-placeholder');
  if (restaurantInfo.logo) {
    logoImg.src = restaurantInfo.logo;
    logoImg.onerror = () => { logoImg.style.display='none'; logoEl.style.display='flex'; };
    logoImg.style.display = 'block';
    logoEl.style.display  = 'none';
  }

  // Footer
  setText('tax-note-text', restaurantInfo.taxNote);
  const wifiSec = $('wifi-section');
  if (wifiSec) {
    if (restaurantInfo.wifi) { setText('wifi-name', restaurantInfo.wifi); wifiSec.style.display='flex'; }
    else wifiSec.style.display = 'none';
  }

  // حسابات التواصل الاجتماعي
  setText('fab-ig-name',     restaurantInfo.instagram || '');
  setText('fab-tiktok-name', restaurantInfo.tiktok    || '');

  // رقم الهاتف في هيدر المنيو
  setText('fab-phone-value', restaurantInfo.phone || '');

  // إخفاء زر الخصم إذا لم يكن هناك رابط Google Maps
  if (!restaurantInfo.googleMapsUrl || restaurantInfo.googleMapsUrl.includes('YOUR_LINK')) {
    const discountBtn = document.querySelector('.header-discount-btn');
    if (discountBtn) discountBtn.style.display = 'none';
  }
}


/* ════════════════════════════════════════════════════════
   CATEGORY TABS  →  scroll anchors
════════════════════════════════════════════════════════ */
function renderCategoryTabs() {
  const wrap = $('category-tabs');
  wrap.innerHTML = '';

  menuCategories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className  = 'cat-tab';
    btn.dataset.id = cat.id;
    btn.innerHTML  =
      `<i class="fa-solid ${cat.icon}"></i>
       <span class="cat-tab-label">${cat.nameAr}</span>`;
    btn.addEventListener('click', () => scrollToSection(cat.id));
    wrap.appendChild(btn);
  });
}

function scrollToSection(catId) {
  // Find the first item of this category in the flat list
  const firstIdx = allItemEls.findIndex(el => el.dataset.cat === catId);
  if (firstIdx === -1) return;

  // Treat tab click as user interaction → pause auto-scroll
  pauseAutoScroll();
  highlightItem(firstIdx);
}

function highlightActiveTab(catId) {
  document.querySelectorAll('.cat-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.id === catId)
  );
}

/* ════════════════════════════════════════════════════════
   RENDER ALL CATEGORIES  (single scrollable list)
════════════════════════════════════════════════════════ */
let allItemEls   = [];   // flat list of every item element
let sectionTops  = {};   // catId → offsetTop of heading

function renderAllCategories() {
  const area = $('menu-items-area');
  area.innerHTML = '';
  allItemEls = [];

  menuCategories.forEach(cat => {
    // Section heading  (also serves as anchor)
    const heading = document.createElement('div');
    heading.className = 'section-heading';
    heading.dataset.cat = cat.id;
    heading.innerHTML =
      `<i class="fa-solid ${cat.icon}"></i>
       <span class="section-heading-text">${cat.nameAr}</span>
       <div class="section-heading-line"></div>`;
    area.appendChild(heading);

    // Items
    cat.items.forEach((item, i) => {
      const card = document.createElement('div');
      card.className   = 'menu-item' + (item.isMeal ? ' menu-item--meal' : '');
      card.dataset.cat = cat.id;

      const badge = _getBadge(cat.id, item.nameAr);
      card.innerHTML = `
        <span class="item-num">0${i + 1}</span>
        <div class="item-img-wrap">
          ${item.image
            ? `<img src="${item.image}" alt="${item.nameAr}"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <div class="item-img-placeholder"${item.image ? ' style="display:none"' : ''}>
            <i class="fa-solid fa-burger"></i>
          </div>
        </div>
        <div class="item-info">
          ${badge ? _badgeHTML(badge) : ''}
          <div class="item-name-ar">${item.nameAr}</div>
          <div class="item-name-en">${item.nameEn}</div>
          ${item.descriptionAr
            ? `<div class="item-desc">${item.descriptionAr}</div>` : ''}
          ${item.variants?.length
            ? `<div class="item-variants">
                 ${item.variants.map(v => `<span class="item-variant-tag" data-vkey="${_devItemKey(cat.id, item.nameAr)}||${v}">${v}</span>`).join('')}
               </div>` : ''}
          <div class="item-meta">
            ${item.calories
              ? `<span class="cal-badge">
                   <i class="fa-solid fa-fire-flame-curved"></i>&thinsp;${item.calories} سعرة
                 </span>` : ''}
          </div>
        </div>
        <div class="item-price-wrap">
          <div class="item-price-badge">
            <span class="item-price-num">${item.price}</span>
            <span class="item-price-cur">ريال</span>
          </div>
        </div>`;

      // ② عرض تفاصيل المنتج عند الضغط
      card.addEventListener('click', () => {
        const idx = allItemEls.indexOf(card);
        pauseAutoScroll();
        showProductOverlay(item, idx);
      });

      area.appendChild(card);
      allItemEls.push(card);
    });
  });

  // Total count
  setText('scroll-total', String(allItemEls.length));
}

/* ════════════════════════════════════════════════════════
   PAUSE / RESUME  (user interaction)
════════════════════════════════════════════════════════ */
let isPaused    = false;
let pauseTimer  = null;

function pauseAutoScroll() {
  // في الوضع العمودي يدير المحرّك الجديد الإيقاف بنفسه
  if (!allItemEls.length) {
    if (typeof window._vxPause === 'function') window._vxPause();
    return;
  }

  // Reset countdown each time user interacts
  clearTimeout(pauseTimer);
  pauseTimer = setTimeout(resumeAutoScroll, PAUSE_DURATION);

  if (isPaused) return; // already paused, just reset timer above
  isPaused = true;
  clearTimeout(autoTimer);

  // Show paused indicator in status bar
  const indicator = document.querySelector('.scroll-item-indicator');
  if (indicator && !indicator.dataset.origHtml) {
    indicator.dataset.origHtml = indicator.innerHTML;
    indicator.innerHTML =
      `<i class="fa-solid fa-hand-pointer" style="color:var(--red)"></i>
       <span style="color:var(--white);font-weight:700">تصفح يدوي</span>`;
  }
  // Stop timer fill
  const fill = $('scroll-timer-fill');
  if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }
}

function resumeAutoScroll() {
  if (!allItemEls.length) {
    if (typeof window._vxResume === 'function') window._vxResume();
    return;
  }

  isPaused = false;
  clearTimeout(pauseTimer);

  // Restore indicator
  const indicator = document.querySelector('.scroll-item-indicator');
  if (indicator && indicator.dataset.origHtml) {
    indicator.innerHTML = indicator.dataset.origHtml;
    delete indicator.dataset.origHtml;
  }

  // Re-highlight current item and resume stepping
  highlightItem(curIdx);
  autoTimer = setTimeout(stepScroll, ITEM_DURATION);
}

/* ════════════════════════════════════════════════════════
   AUTO-SCROLL ENGINE
════════════════════════════════════════════════════════ */
let curIdx        = 0;
let autoTimer     = null;
let progScroll    = false; // true while centerItem is scrolling programmatically

function highlightItem(idx) {
  // Clamp & store
  idx = ((idx % allItemEls.length) + allItemEls.length) % allItemEls.length;
  curIdx = idx;

  // Remove old highlight
  allItemEls.forEach(el => el.classList.remove('highlighted'));

  const el = allItemEls[idx];
  if (!el) return;
  el.classList.add('highlighted');

  // ── Small delay so the browser registers the new class before we call
  //    getBoundingClientRect() inside centerItem (forces a layout reflow).
  setTimeout(() => centerItem(el), HIGHLIGHT_DELAY);

  // Status bar
  setText('scroll-cur', String(idx + 1));
  const catId = el.dataset.cat;
  const cat   = menuCategories.find(c => c.id === catId);
  if (cat) {
    setText('scroll-cat-label', cat.nameAr);
    highlightActiveTab(catId);
  }

  // Timer fill
  const fill = $('scroll-timer-fill');
  if (fill) {
    fill.style.transition = 'none';
    fill.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = `width ${ITEM_DURATION}ms linear`;
      fill.style.width = '100%';
    }));
  }
}

/* ── Scroll config ── */
const SCROLL_TOP_OFFSET = 10;   // px gap above the category heading

/**
 * After rendering all items, add enough padding-bottom to the scroll area
 * so that even the LAST category heading can be scrolled to the very top.
 *
 * Without this, categories near the bottom of a long menu can never reach
 * scrollTop = headingAbsTop, because the content isn't tall enough.
 */
function fixScrollablePadding() {
  const area = $('menu-items-area');
  if (!area) return;

  const headings = area.querySelectorAll('.section-heading');
  if (!headings.length) return;

  // Reset to base padding first so measurements are clean
  area.style.paddingBottom = '16px';

  requestAnimationFrame(() => {
    const areaRect = area.getBoundingClientRect();

    // Find the heading that needs the largest scrollTop to reach the top
    let maxNeeded = 0;
    headings.forEach(h => {
      const hRect   = h.getBoundingClientRect();
      const absTop  = hRect.top - areaRect.top + area.scrollTop;
      const needed  = absTop - SCROLL_TOP_OFFSET;   // desired scrollTop for this heading
      if (needed > maxNeeded) maxNeeded = needed;
    });

    const currentMax = area.scrollHeight - area.clientHeight;
    if (maxNeeded > currentMax) {
      // Add the deficit as extra bottom padding
      const extra = Math.ceil(maxNeeded - currentMax) + 20;   // +20 safety buffer
      area.style.paddingBottom = `${extra + 16}px`;           // keep original 16px
    }
  });
}

/**
 * Scroll menu-items-area to the SECTION HEADING of the highlighted item's
 * category so the category name is always visible at the top.
 *
 * - Always anchors to the heading (not the item itself).
 * - Compares against the clamped target so same-category items don't
 *   trigger a redundant scroll call.
 * - Uses getBoundingClientRect() — always pixel-accurate.
 */
function centerItem(el) {
  const area = $('menu-items-area');
  if (!area || !el) return;

  const catId   = el.dataset.cat;
  const heading = area.querySelector(`.section-heading[data-cat="${catId}"]`);
  const anchor  = heading || el;

  const areaRect   = area.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();

  // Absolute top of the heading within the scroll content
  const absTop  = anchorRect.top - areaRect.top + area.scrollTop;
  const target  = Math.max(0, absTop - SCROLL_TOP_OFFSET);

  // Clamp to the real scrollable limit (after fixScrollablePadding this should
  // always be reachable, but guard just in case)
  const maxScroll = area.scrollHeight - area.clientHeight;
  const clamped   = Math.min(target, maxScroll);

  // Skip if we're already there (same-category transition — no movement needed)
  if (Math.abs(area.scrollTop - clamped) < 6) return;

  progScroll = true;
  area.scrollTo({ top: clamped, behavior: 'smooth' });
  // Reset flag after animation completes (~600ms)
  setTimeout(() => { progScroll = false; }, 700);
}

function stepScroll() {
  clearTimeout(autoTimer);
  if (isPaused) return;

  // تخطّى المنتجات المخفية
  let nextIdx = (curIdx + 1) % allItemEls.length;
  let attempts = 0;
  while (allItemEls[nextIdx]?.style.display === 'none' && attempts < allItemEls.length) {
    nextIdx = (nextIdx + 1) % allItemEls.length;
    attempts++;
  }
  if (attempts === allItemEls.length) return; // كل المنتجات مخفية

  const nextEl = allItemEls[nextIdx];
  const curEl  = allItemEls[curIdx];

  const catChanged = nextEl && curEl && nextEl.dataset.cat !== curEl.dataset.cat;
  const delay      = catChanged ? ITEM_DURATION + 800 : ITEM_DURATION;

  highlightItem(nextIdx);
  autoTimer = setTimeout(stepScroll, delay);
}

function startAutoScroll() {
  // ابدأ من أول منتج مرئي
  let startIdx = 0;
  while (startIdx < allItemEls.length && allItemEls[startIdx]?.style.display === 'none') {
    startIdx++;
  }
  highlightItem(startIdx % (allItemEls.length || 1));
  autoTimer = setTimeout(stepScroll, ITEM_DURATION);
}

/* ════════════════════════════════════════════════════════
   PRODUCT DETAIL OVERLAY
════════════════════════════════════════════════════════ */
let productOverlayTimer    = null;
let productOverlayItemIdx  = -1;
let overlayChanging        = false;
let _overlayHasImage       = false;   // هل الـ overlay يعرض صورة حالياً؟
let _imgCrossfadeTimer     = null;
const PRODUCT_OVERLAY_DURATION = 8000;
const OVERLAY_CHANGE_DURATION  = 260;   // ms — تلاشي النص قبل التبديل
const OVERLAY_CLOSE_DURATION   = 430;
const CROSSFADE_DURATION       = 520;   // ms — مدة التبديل بين الصورتين

/* ── Crossfade بين صورتين دون إظهار الخلفية ── */
function _crossfadeOverlayImage(newSrc) {
  const img1  = $('product-overlay-img');
  const img2  = $('product-overlay-img2');
  const imgPh = $('product-overlay-img-ph');

  if (!newSrc) {
    img1.style.display = 'none';
    img2.style.display = 'none';
    imgPh.style.display = 'flex';
    _overlayHasImage = false;
    return;
  }

  imgPh.style.display = 'none';

  if (!_overlayHasImage) {
    // فتح أول مرة — تعيين مباشر بدون crossfade
    img1.src           = newSrc;
    img1.style.display = 'block';
    img1.style.opacity = '1';
    img2.style.display = 'none';
    img2.style.opacity = '0';
    _overlayHasImage   = true;
    return;
  }

  // التبديل بين منتجين — crossfade: img2 تتلاشى فوق img1 ثم تصبح هي img1
  clearTimeout(_imgCrossfadeTimer);

  img2.src = newSrc;
  img2.style.display     = 'block';
  img2.style.transition  = 'none';
  img2.style.opacity     = '0';

  requestAnimationFrame(() => requestAnimationFrame(() => {
    img2.style.transition = `opacity ${CROSSFADE_DURATION}ms ease`;
    img2.style.opacity    = '1';
  }));

  _imgCrossfadeTimer = setTimeout(() => {
    img1.src           = newSrc;
    img1.style.display = 'block';
    img1.style.opacity = '1';
    img2.style.transition = 'none';
    img2.style.opacity    = '0';
    setTimeout(() => { img2.style.display = 'none'; }, 50);
  }, CROSSFADE_DURATION + 30);
}

/* ── تعبئة بيانات المنتج (نصوص + صورة) ── */
function _fillOverlayContent(item, idx) {
  productOverlayItemIdx = idx;

  const priceWrap = $('product-overlay-price-wrap');
  const calEl     = $('product-overlay-cal');

  // النصوص
  $('product-overlay-name-ar').textContent = item.nameAr        || '';
  $('product-overlay-name-en').textContent = item.nameEn        || '';
  $('product-overlay-desc').textContent    = item.descriptionAr || '';
  $('product-overlay-desc').style.display  = item.descriptionAr ? 'block' : 'none';

  // تتبع المشاهدة + الشارة في الـ overlay
  const _ovCat = menuCategories.find(c => c.items.includes(item));
  if (_ovCat) {
    _trackView(_ovCat.id, item.nameAr);
    // شارة الـ overlay
    let obEl = $('product-overlay-badge');
    if (!obEl) {
      obEl = document.createElement('div');
      obEl.id = 'product-overlay-badge';
      obEl.className = 'product-overlay-badge-wrap';
      const infoEl = document.querySelector('.product-overlay-info');
      if (infoEl) infoEl.prepend(obEl);
    }
    const ob = _getBadge(_ovCat.id, item.nameAr);
    obEl.innerHTML  = ob ? _badgeHTML(ob) : '';
    obEl.style.display = ob ? 'block' : 'none';
  }

  // الأنواع / الخيارات
  const variantsEl = $('product-overlay-variants');
  if (variantsEl) {
    if (item.variants?.length) {
      const catId = _ovCat?.id || '';
      variantsEl.innerHTML = item.variants
        .filter(v => !_devHiddenVariants.has(_devItemKey(catId, item.nameAr) + '||' + v))
        .map(v => `<span class="overlay-variant-tag" data-vkey="${_devItemKey(catId, item.nameAr)}||${v}">${v}</span>`)
        .join('');
      variantsEl.style.display = variantsEl.innerHTML ? 'flex' : 'none';
    } else {
      variantsEl.innerHTML = '';
      variantsEl.style.display = 'none';
    }
  }

  // السعرات
  if (item.calories) {
    $('product-overlay-cal-num').textContent = item.calories;
    calEl.style.display = 'inline-flex';
  } else {
    calEl.style.display = 'none';
  }

  // الصورة — crossfade سلس
  _crossfadeOverlayImage(item.image || '');

  // السعر
  if (item.price != null) {
    $('product-overlay-price-num').textContent = item.price;
    priceWrap.style.display = 'inline-flex';
  } else {
    priceWrap.style.display = 'none';
  }

  highlightItem(idx);
}

/* ── إظهار الـ overlay / التبديل بين المنتجات ── */
function showProductOverlay(item, idx) {
  const overlay = $('product-overlay');

  clearTimeout(productOverlayTimer);
  productOverlayTimer = setTimeout(hideProductOverlay, PRODUCT_OVERLAY_DURATION);

  if (overlay.classList.contains('active')) {
    /* الـ overlay مفتوح — تبديل سلس بين منتجين */
    if (overlayChanging) return;          // تجاهل النقر السريع جداً
    overlayChanging = true;
    overlay.classList.add('changing');

    setTimeout(() => {
      _fillOverlayContent(item, idx);
      overlay.classList.remove('changing');
      overlayChanging = false;
    }, OVERLAY_CHANGE_DURATION);

  } else {
    /* فتح أول مرة — ينبثق من الأسفل */
    _fillOverlayContent(item, idx);
    overlay.classList.remove('closing');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));
  }
}

/* ── إغلاق الـ overlay والعودة للتلقائي ── */
function hideProductOverlay() {
  clearTimeout(productOverlayTimer);
  clearTimeout(_imgCrossfadeTimer);
  overlayChanging    = false;
  _overlayHasImage   = false;   // إعادة تعيين لفتح سلس في المرة القادمة

  // إلغاء تحديد المنتج
  if (productOverlayItemIdx >= 0) {
    allItemEls[productOverlayItemIdx]?.classList.remove('highlighted');
    productOverlayItemIdx = -1;
  }

  const overlay = $('product-overlay');
  overlay.classList.remove('active', 'changing');
  overlay.classList.add('closing');

  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.classList.remove('closing');
    // العودة للتمرير التلقائي بعد اكتمال الانتقال
    resumeAutoScroll();
  }, OVERLAY_CLOSE_DURATION);
}
window.hideProductOverlay = hideProductOverlay;

/* ════════════════════════════════════════════════════════
   REVIEW / DISCOUNT OVERLAY
════════════════════════════════════════════════════════ */
const REVIEW_OVERLAY_DURATION = 16000;   // ms — يُغلق تلقائياً
let   _reviewTimer = null;

function showReviewOverlay() {
  const overlay = $('review-overlay');
  if (!overlay) return;

  // إغلاق product overlay إن كان مفتوحاً
  const productOverlay = $('product-overlay');
  if (productOverlay?.classList.contains('active')) hideProductOverlay();

  // تعيين صورة QR — إظهار مربع البديل أولاً ثم تحميل الصورة
  const qrImg      = $('review-qr-img');
  const qrFallback = $('review-qr-fallback');
  if (qrImg) {
    if (restaurantInfo.googleMapsQr) {
      // إخفاء البديل وإظهار الصورة
      if (qrFallback) qrFallback.style.display = 'none';
      qrImg.style.display = 'block';
      qrImg.src = restaurantInfo.googleMapsQr;
    } else {
      // لا يوجد QR — أظهر البديل
      qrImg.style.display = 'none';
      if (qrFallback) qrFallback.style.display = 'flex';
    }
  }

  // إيقاف عداد سابق
  clearTimeout(_reviewTimer);

  // إظهار — block يكفي لأن التخطيط الداخلي يعتمد على position:absolute
  overlay.style.display = 'block';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.classList.remove('closing');
    overlay.classList.add('active');
  }));

  // شريط العداد
  _startReviewTimer();

  // إغلاق تلقائي
  _reviewTimer = setTimeout(hideReviewOverlay, REVIEW_OVERLAY_DURATION);

  // إيقاف التمرير التلقائي أثناء العرض
  pauseAutoScroll();
}

function hideReviewOverlay() {
  clearTimeout(_reviewTimer);
  const overlay = $('review-overlay');
  if (!overlay) return;

  overlay.classList.remove('active');
  overlay.classList.add('closing');

  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.classList.remove('closing');
    resumeAutoScroll();
  }, 450);
}
window.hideReviewOverlay = hideReviewOverlay;
window.showReviewOverlay  = showReviewOverlay;

function _startReviewTimer() {
  const fill = $('review-timer-fill');
  if (!fill) return;
  fill.style.transition = 'none';
  fill.style.width = '100%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.transition = `width ${REVIEW_OVERLAY_DURATION}ms linear`;
    fill.style.width = '0%';
  }));
}

/* ════════════════════════════════════════════════════════
   SLIDESHOW
════════════════════════════════════════════════════════ */
let curSlide  = 0;
let slideTimer = null;

function renderSlides() {
  const wrapper = $('slides-wrapper');
  const dotsEl  = $('slide-dots');
  wrapper.innerHTML = '';
  dotsEl.innerHTML  = '';

  slides.forEach((slide, i) => {
    const el = document.createElement('div');
    el.className = 'slide' + (i === 0 ? ' active' : '') + (slide.isGame ? ' slide--game' : '');

    if (slide.isGame) {
      // ── شريحة اللعبة ──
      const gIcon    = slide.icon || 'fa-bolt';
      const launcher = slide.game === 'xo' ? 'launchXO()' : 'launchDuoGame()';
      const hintId   = slide.game === 'xo' ? 'xo-slide-hint' : 'game-slide-hint';
      el.innerHTML = `
        <div class="game-slide-bg game-slide-bg--${slide.game || 'reaction'}"></div>
        <div class="slide-content game-slide-content">
          ${slide.badge
            ? `<div class="slide-badge ${slide.badgeColor || 'gold'}">
                 <i class="fa-solid ${gIcon}"></i>&nbsp;${slide.badge}
               </div>` : ''}
          <div class="game-slide-icon"><i class="fa-solid ${gIcon}"></i></div>
          <div class="slide-title-ar">${slide.titleAr}</div>
          ${slide.titleEn ? `<div class="slide-title-en">${slide.titleEn}</div>` : ''}
          ${slide.descriptionAr ? `<div class="slide-desc">${slide.descriptionAr}</div>` : ''}
          <button class="game-play-btn" onclick="${launcher}">
            <i class="fa-solid fa-play"></i> العب الآن
          </button>
          <div id="${hintId}" class="game-slide-hint"></div>
        </div>`;
    } else {
      el.innerHTML = `
        <img class="slide-img" src="${slide.image}" alt="${slide.titleAr}"
             onerror="this.style.background='#0a0001'">
        <div class="slide-content">
          ${slide.badge
            ? `<div class="slide-badge ${slide.badgeColor || 'red'}">
                 <i class="fa-solid fa-star"></i>&nbsp;${slide.badge}
               </div>` : ''}
          <div class="slide-title-ar">${slide.titleAr}</div>
          ${slide.titleEn ? `<div class="slide-title-en">${slide.titleEn}</div>` : ''}
          ${slide.descriptionAr ? `<div class="slide-desc">${slide.descriptionAr}</div>` : ''}
          ${slide.price != null
            ? `<div class="slide-price-tag">
                 ${slide.price}<span class="currency"> ريال</span>
               </div>` : ''}
        </div>`;
    }
    wrapper.appendChild(el);

    const dot = document.createElement('div');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goToSlide(i));
    dotsEl.appendChild(dot);
  });

  fillSlideProgress();
  scheduleSlide();
}

function goToSlide(idx, _attempt) {
  _attempt = _attempt || 0;
  const slideEls = document.querySelectorAll('.slide');
  // تخطّى الشرائح المخفية
  if (_attempt < slides.length && slideEls[idx]?.dataset.devHidden === 'true') {
    return goToSlide((idx + 1) % slides.length, _attempt + 1);
  }
  if (_attempt === slides.length) return; // كل الشرائح مخفية

  slideEls.forEach((s,i) => s.classList.toggle('active', i===idx));
  document.querySelectorAll('.dot').forEach((d,i) => d.classList.toggle('active', i===idx));
  curSlide = idx;
  clearTimeout(slideTimer);
  fillSlideProgress();
  scheduleSlide();
}
function scheduleSlide() {
  const dur = slides[curSlide]?.duration || 5000;
  slideTimer = setTimeout(() => goToSlide((curSlide+1) % slides.length), dur);
}
function fillSlideProgress() {
  const fill = $('progress-fill');
  if (!fill) return;
  const dur = slides[curSlide]?.duration || 5000;
  fill.style.transition = 'none'; fill.style.width = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.transition = `width ${dur}ms linear`;
    fill.style.width = '100%';
  }));
}

/* ════════════════════════════════════════════════════════
   HIDDEN LOGO TAPS:
     3× → مسح الكاش (بعد 1.2 ثانية بدون متابعة)
     5× → لوحة تحكم المطور
════════════════════════════════════════════════════════ */
function setupLogoSecretTap() {
  const logoWrap = $('logo-wrap');
  if (!logoWrap) return;

  let tapCount = 0;
  let tapTimer = null;
  let lastTouchEnd = 0;

  function onTap() {
    tapCount++;
    clearTimeout(tapTimer);
    _showUpdateToast(tapCount);

    if (tapCount >= 5) {
      tapCount = 0;
      _hideUpdateToast();
      showDevPasswordModal();
      return;
    }

    tapTimer = setTimeout(() => {
      if (tapCount === 3) {
        _forceUpdateApp();   // ٣ نقرات + انتهاء المهلة → مسح الكاش
      }
      tapCount = 0;
      _hideUpdateToast();
    }, 1200);
  }

  logoWrap.addEventListener('touchend', e => {
    e.preventDefault();
    lastTouchEnd = Date.now();
    onTap();
  }, { passive: false });

  logoWrap.addEventListener('click', () => {
    if (Date.now() - lastTouchEnd < 400) return;
    onTap();
  });
}

/* شريط تقدم صغير في أعلى الشاشة */
function _showUpdateToast(count) {
  let toast = $('update-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'update-toast';
    document.body.appendChild(toast);
    Object.assign(toast.style, {
      position: 'fixed', top: '18px', left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(10,0,2,.88)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(190,30,45,.35)',
      color: '#fff', borderRadius: '100px',
      padding: '12px 32px', fontSize: '20px',
      fontFamily: "'Tajawal',sans-serif", fontWeight: '700',
      zIndex: '99999', pointerEvents: 'none',
      opacity: '0', transition: 'opacity .25s',
      whiteSpace: 'nowrap',
    });
  }

  clearTimeout(toast._hide);

  const dotStates = ['○○○○○','◉○○○○','◉◉○○○','◉◉◉○○','◉◉◉◉○','◉◉◉◉◉'];
  const dots = dotStates[Math.min(count, 5)] || '◉◉◉◉◉';

  if (count < 5) {
    const isThree = count === 3;
    toast.innerHTML =
      `<span style="color:${isThree ? '#f5c200' : 'var(--red,#be1e2d)'};letter-spacing:10px">${dots}</span>`;
    toast.style.opacity = '1';
    toast._hide = setTimeout(_hideUpdateToast, 1800);
  } else {
    toast.innerHTML =
      `<i class="fa-solid fa-gear" style="color:#f5c200;margin-left:10px"></i>` +
      `فتح لوحة التحكم…`;
    toast.style.opacity = '1';
  }
}

function _hideUpdateToast() {
  const toast = $('update-toast');
  if (toast) toast.style.opacity = '0';
}

async function _forceUpdateApp() {
  try {
    // 1. مسح جميع الـ caches
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    // 2. إلغاء تسجيل الـ Service Worker (سيُعاد تسجيله بعد الريلود)
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch (e) {
    console.warn('[Update] Cache clear error:', e);
  }
  // 3. إعادة تحميل إجبارية بعد لحظة لتظهر رسالة التحديث
  setTimeout(() => window.location.reload(true), 900);
}

/* ════════════════════════════════════════════════════════
   DEV ADMIN PANEL
════════════════════════════════════════════════════════ */
const DEV_PASSWORD = '812100';
const SS_ITEMS     = 'duo_hidden_items';
const SS_SLIDES    = 'duo_hidden_slides';
const SS_DISCOUNT  = 'duo_discount_hidden';
const SS_PHONE     = 'duo_phone_hidden';
const SS_GAMES     = 'duo_games_hidden';
const SS_VARIANTS  = 'duo_hidden_variants';
const LS_BADGES    = 'duo_badges';
const LS_STATS_PFX = 'duo_stats_';

let _devHiddenItems    = new Set();
let _devHiddenSlides   = new Set();
let _devHiddenVariants = new Set();
let _devDiscountHidden = false;
let _devPhoneHidden    = false;
let _devGamesHidden    = false;
let _devBadges         = {};   // { "catId||nameAr": "popular"|"new"|"limited"|"" }

/* ── إحصائيات المشاهدة ── */
function _todayKey()  { return LS_STATS_PFX + new Date().toISOString().slice(0, 10); }
function _getStats()  { try { return JSON.parse(localStorage.getItem(_todayKey()) || '{}'); } catch { return {}; } }
function _trackView(catId, nameAr) {
  const k = _todayKey(), stats = _getStats();
  stats[_devItemKey(catId, nameAr)] = (stats[_devItemKey(catId, nameAr)] || 0) + 1;
  localStorage.setItem(k, JSON.stringify(stats));
}

/* ── الشارات ── */
const BADGE_META = {
  popular: { label: 'الأكثر طلباً', icon: 'fa-fire',        cls: 'badge--popular' },
  new:     { label: 'جديد',         icon: 'fa-star',         cls: 'badge--new'     },
  limited: { label: 'محدود',        icon: 'fa-clock',        cls: 'badge--limited' },
};
function _loadBadges()  { try { _devBadges = JSON.parse(localStorage.getItem(LS_BADGES) || '{}'); } catch { _devBadges = {}; } }
function _saveBadges()  { localStorage.setItem(LS_BADGES, JSON.stringify(_devBadges)); }
function _getBadge(catId, nameAr) { return _devBadges[_devItemKey(catId, nameAr)] || ''; }
function _badgeHTML(badge) {
  if (!badge || !BADGE_META[badge]) return '';
  const m = BADGE_META[badge];
  return `<span class="item-badge ${m.cls}"><i class="fa-solid ${m.icon}"></i> ${m.label}</span>`;
}

function _devItemKey(catId, nameAr) { return catId + '||' + nameAr; }

/* تحميل الإعدادات من sessionStorage */
function _devLoadSettings() {
  try {
    _devHiddenItems    = new Set(JSON.parse(sessionStorage.getItem(SS_ITEMS)    || '[]'));
    _devHiddenSlides   = new Set(JSON.parse(sessionStorage.getItem(SS_SLIDES)   || '[]').map(String));
    _devHiddenVariants = new Set(JSON.parse(sessionStorage.getItem(SS_VARIANTS) || '[]'));
    // الزر والهاتف يظهران دائماً بشكل افتراضي — القيمة false إلا إذا خُصِّصت صراحةً
    const discRaw = sessionStorage.getItem(SS_DISCOUNT);
    const phoneRaw = sessionStorage.getItem(SS_PHONE);
    _devDiscountHidden = discRaw  === 'true';
    _devPhoneHidden    = phoneRaw === 'true';
    _devGamesHidden    = sessionStorage.getItem(SS_GAMES) === 'true';
    // ضمان: إذا لم تُحدَّد بعد، تأكّد من وضعها كـ "ظاهر"
    if (discRaw  === null) { sessionStorage.setItem(SS_DISCOUNT, 'false'); _devDiscountHidden = false; }
    if (phoneRaw === null) { sessionStorage.setItem(SS_PHONE,    'false'); _devPhoneHidden    = false; }
    _loadBadges();
  } catch(e) {
    _devHiddenItems = new Set(); _devHiddenSlides = new Set();
    _devHiddenVariants = new Set(); _devDiscountHidden = false; _devPhoneHidden = false;
  }
}

/* إعادة ضبط ظهور الزرين قسراً (تُستخدم عند الحاجة) */
function _forceShowHeaderButtons() {
  _devDiscountHidden = false;
  _devPhoneHidden    = false;
  sessionStorage.setItem(SS_DISCOUNT, 'false');
  sessionStorage.setItem(SS_PHONE,    'false');
  applyDevSettings();
}

/* تطبيق الإعدادات على الـ DOM */
function applyDevSettings() {
  // المنتجات
  allItemEls.forEach(el => {
    const nameEl = el.querySelector('.item-name-ar');
    const key    = _devItemKey(el.dataset.cat, nameEl?.textContent || '');
    el.style.display = _devHiddenItems.has(key) ? 'none' : '';
  });

  // الشرائح
  document.querySelectorAll('.slide').forEach((el, i) => {
    if (_devHiddenSlides.has(String(i))) el.dataset.devHidden = 'true';
    else delete el.dataset.devHidden;
  });
  // انتقل للشريحة التالية إذا كانت الحالية مخفية
  const slideEls = document.querySelectorAll('.slide');
  if (slideEls[curSlide]?.dataset.devHidden === 'true') {
    goToSlide((curSlide + 1) % slides.length);
  }

  // الخيارات / الأنواع (variants)
  document.querySelectorAll('.item-variant-tag[data-vkey]').forEach(tag => {
    tag.style.display = _devHiddenVariants.has(tag.dataset.vkey) ? 'none' : '';
  });

  // زر الخصم (أفقي + عمودي)
  const discBtn = document.querySelector('.header-discount-btn');
  if (discBtn) discBtn.style.display = _devDiscountHidden ? 'none' : '';
  const discBtnV = $('vl-discount-btn');
  if (discBtnV) discBtnV.style.display = _devDiscountHidden ? 'none' : '';

  // زر الهاتف (أفقي + عمودي)
  const phoneRow = $('header-phone-row');
  if (phoneRow) phoneRow.style.display = _devPhoneHidden ? 'none' : '';
  const phoneRowV = $('vl-phone-row');
  if (phoneRowV) phoneRowV.style.display = _devPhoneHidden ? 'none' : '';

  // زر الألعاب "مَن يدفع؟" (أفقي + عمودي)
  const gamesBtn = $('header-games-btn');
  if (gamesBtn) gamesBtn.style.display = _devGamesHidden ? 'none' : '';
  const gamesBtnV = $('vl-games-btn');
  if (gamesBtnV) gamesBtnV.style.display = _devGamesHidden ? 'none' : '';

  // عداد المنتجات
  const visCount = allItemEls.filter(el => el.style.display !== 'none').length;
  setText('scroll-total', String(visCount || allItemEls.length));
}

/* ════════════════════════════════════════════════════════
   مزامنة الإعدادات من الجهاز الآخر (عبر Firebase / DuoSync)
   عند تغيير أي إعداد في لوحة تحكم أحد الجهازين، يصل هنا فيُطبَّق فوراً.
════════════════════════════════════════════════════════ */
function applyRemoteSettings(v) {
  if (!v || typeof v !== 'object') return;
  try {
    _devHiddenItems    = new Set(v.hiddenItems    || []);
    _devHiddenSlides   = new Set((v.hiddenSlides  || []).map(String));
    _devHiddenVariants = new Set(v.hiddenVariants || []);
    _devDiscountHidden = !!v.discountHidden;
    _devPhoneHidden    = !!v.phoneHidden;
    _devGamesHidden    = !!v.gamesHidden;
    _devBadges         = v.badges || {};

    // خزّن محلياً كنسخة احتياطية
    sessionStorage.setItem(SS_ITEMS,    JSON.stringify([..._devHiddenItems]));
    sessionStorage.setItem(SS_SLIDES,   JSON.stringify([..._devHiddenSlides]));
    sessionStorage.setItem(SS_VARIANTS, JSON.stringify([..._devHiddenVariants]));
    sessionStorage.setItem(SS_DISCOUNT, String(_devDiscountHidden));
    sessionStorage.setItem(SS_PHONE,    String(_devPhoneHidden));
    sessionStorage.setItem(SS_GAMES,    String(_devGamesHidden));
    localStorage.setItem(LS_BADGES,     JSON.stringify(_devBadges));

    _refreshAllBadges();
    applyDevSettings();
  } catch (e) { console.warn('[Sync] apply error:', e); }
}
window.applyRemoteSettings = applyRemoteSettings;

/* تحديث شارات كل البطاقات بحسب _devBadges */
function _refreshAllBadges() {
  document.querySelectorAll('.menu-item').forEach(card => {
    const nameEl = card.querySelector('.item-name-ar');
    const catId  = card.dataset.cat;
    if (!nameEl) return;
    const key    = _devItemKey(catId, nameEl.textContent.trim());
    const infoEl = card.querySelector('.item-info');
    if (!infoEl) return;
    let badgeEl  = infoEl.querySelector('.item-badge');
    const newHtml = _badgeHTML(_devBadges[key] || '');
    if (badgeEl) { if (newHtml) badgeEl.outerHTML = newHtml; else badgeEl.remove(); }
    else if (newHtml) infoEl.insertAdjacentHTML('afterbegin', newHtml);
  });
}

/* ── لوحة الأرقام المخصصة ── */
let _devPinValue = '';
const PIN_MAX = DEV_PASSWORD.length;  // 6 خانات

function _updatePinDisplay() {
  for (let i = 0; i < PIN_MAX; i++) {
    const dot = $('dev-pin-dot-' + i);
    if (dot) dot.classList.toggle('filled', i < _devPinValue.length);
  }
}

function devKeyPress(digit) {
  if (_devPinValue.length >= PIN_MAX) return;
  // إخفاء رسالة الخطأ عند البدء بالإدخال مجدداً
  const err = $('dev-pwd-error');
  if (err) err.style.display = 'none';
  _devPinValue += digit;
  _updatePinDisplay();
  // تحقق تلقائي عند اكتمال الخانات
  if (_devPinValue.length === PIN_MAX) {
    setTimeout(checkDevPassword, 180);
  }
}

function devKeyDelete() {
  _devPinValue = _devPinValue.slice(0, -1);
  _updatePinDisplay();
  const err = $('dev-pwd-error');
  if (err) err.style.display = 'none';
}

window.devKeyPress  = devKeyPress;
window.devKeyDelete = devKeyDelete;

/* نافذة كلمة السر */
function showDevPasswordModal() {
  const modal = $('dev-pwd-modal');
  if (!modal) return;
  _devPinValue = '';
  _updatePinDisplay();
  const err = $('dev-pwd-error');
  if (err) err.style.display = 'none';
  modal.style.display = 'flex';
}
function closeDevModal() {
  const m = $('dev-pwd-modal');
  if (m) m.style.display = 'none';
  _devPinValue = '';
}
function checkDevPassword() {
  if (_devPinValue === DEV_PASSWORD) {
    closeDevModal();
    // فتح صفحة الداشبورد المنفصلة
    window.location.href = 'dashboard.html';
  } else {
    // هزّ شاشة النقاط وأظهر الخطأ
    const display = $('dev-pin-display');
    if (display) {
      display.classList.remove('shake');
      void display.offsetWidth; // إعادة تشغيل الـ animation
      display.classList.add('shake');
    }
    const err = $('dev-pwd-error');
    if (err) err.style.display = 'flex';
    setTimeout(() => {
      _devPinValue = '';
      _updatePinDisplay();
      if (display) display.classList.remove('shake');
      if (err) err.style.display = 'none';
    }, 1200);
  }
}
window.showDevPasswordModal = showDevPasswordModal;
window.closeDevModal        = closeDevModal;
window.checkDevPassword     = checkDevPassword;

/* ════════════════════════════════════════════════════════
   SCREEN FIT  —  ملاءمة الموقع لحجم الشاشة تلقائياً
   ─────────────────────────────────────────────────────────
   التصميم الأصلي 2000×1200. نُطبّق transform:scale على .screen
   بحيث يملأ نافذة المتصفح بالكامل دون قصّ. يعمل عند التحميل
   وعند أي تغيير في حجم النافذة.
════════════════════════════════════════════════════════ */
const BASE_W    = 2000;
const BASE_H    = 1200;
const BASE_W_VL = 1080;   // بورتريه عمودي
const BASE_H_VL = 1920;
const LS_SCALE_MODE = 'duo_scale_mode';   // 'auto' | 'manual'
const LS_SCALE_VAL  = 'duo_screen_scale'; // رقم المقياس اليدوي
const LS_LAYOUT     = 'duo_menu_layout';  // 'horizontal' | 'vertical'

function fitScreenToViewport() {
  // اختر الشاشة المرئية: العمودية إن كانت مفعّلة، وإلا الأفقية
  const vlScreen = document.getElementById('screen-vertical');
  const isVl = vlScreen && vlScreen.style.display !== 'none';
  const screenEl = isVl
                   ? vlScreen
                   : document.querySelector('.screen:not(#screen-vertical)');
  if (!screenEl) return;

  // أبعاد التصميم الأصلية (مختلفة حسب الوضع)
  const baseW = isVl ? BASE_W_VL : BASE_W;
  const baseH = isVl ? BASE_H_VL : BASE_H;

  const mode = localStorage.getItem(LS_SCALE_MODE) || 'auto';
  let scale;

  if (mode === 'manual') {
    scale = parseFloat(localStorage.getItem(LS_SCALE_VAL)) || 1;
  } else {
    // ملاءمة تلقائية: أكبر مقياس يجعل التصميم يدخل داخل النافذة كاملاً
    scale = Math.min(window.innerWidth / baseW, window.innerHeight / baseH);
  }

  screenEl.style.transformOrigin = 'top left';
  screenEl.style.transform = `scale(${scale})`;

  // توسيط ما تبقّى من فراغ
  const left = Math.max(0, (window.innerWidth  - baseW * scale) / 2);
  const top  = Math.max(0, (window.innerHeight - baseH * scale) / 2);
  screenEl.style.position = 'absolute';
  screenEl.style.left = left + 'px';
  screenEl.style.top  = top  + 'px';
}
window.fitScreenToViewport = fitScreenToViewport;

// إعادة الملاءمة عند تغيير حجم النافذة أو تدوير الجهاز
window.addEventListener('resize', fitScreenToViewport);
window.addEventListener('orientationchange', fitScreenToViewport);

/* ════════════════════════════════════════════════════════
   VERTICAL LAYOUT — Liquid Glass  (النسخة القديمة — غير مستخدمة)
   ─────────────────────────────────────────────────────────
   ⚠️ استُبدل هذا المحرّك بالعرض السينمائي في vmenu.js.
   الكود أدناه لم يعد يُستدعى من أي مكان، ومُبقى مؤقتاً
   للرجوع إليه فقط — يمكن حذفه بأمان (حتى نهاية
   الدالة _vlRebuildIfActive).
════════════════════════════════════════════════════════ */
let _vlCats       = [];   // [{id, nameAr, icon, visItems:[…]}]
let _vlCurCatIdx  = 0;    // القسم الحالي
let _vlCurProdIdx = 0;    // المنتج الحالي داخل القسم
let _vlTimer      = null;
let _vlPaused     = false;
let _vlPauseTimer2 = null;
let _vlCurImgSrc  = '';
let _vlImgFadeTimer = null;

function _vlInit() {
  /* هيدر */
  const logo  = restaurantInfo.logo;
  const vImg  = document.getElementById('vl-logo-img');
  const vPh   = document.getElementById('vl-logo-ph');
  if (logo && vImg) {
    vImg.src = logo;
    vImg.style.display = 'block';
    if (vPh) vPh.style.display = 'none';
  }
  setText('vl-name-ar',    restaurantInfo.nameAr    || '');
  setText('vl-name-en',    restaurantInfo.nameEn    || '');
  setText('vl-tagline',    restaurantInfo.taglineAr || '');
  setText('vl-tax-text',   restaurantInfo.taxNote   || '');
  setText('vl-phone-value', restaurantInfo.phone    || '');

  /* إخفاء زر الخصم إذا لم يكن هناك رابط Google Maps */
  if (!restaurantInfo.googleMapsUrl || restaurantInfo.googleMapsUrl.includes('YOUR_LINK')) {
    const vDisc = $('vl-discount-btn');
    if (vDisc) vDisc.style.display = 'none';
  }

  _vlBuildCats();
  setTimeout(_vlStart, 900);

  /* إيقاف مؤقت عند لمس قسم المنتجات */
  const sectDisplay = document.getElementById('vl-section-display');
  if (sectDisplay) {
    sectDisplay.addEventListener('touchstart', _vlPause, { passive: true });
  }
}

/* بناء قائمة الأقسام من menuCategories */
function _vlBuildCats() {
  _vlCats = [];
  menuCategories.forEach(cat => {
    const visItems = cat.items.filter(it =>
      !_devHiddenItems.has(_devItemKey(cat.id, it.nameAr))
    );
    if (!visItems.length) return;
    _vlCats.push({ id: cat.id, nameAr: cat.nameAr, icon: cat.icon, visItems });
  });
}

/* تصيير قسم بعينه: رأس + صفوف + زر التالي */
function _vlRenderCategory(catIdx) {
  const cat = _vlCats[catIdx];
  if (!cat) return;

  /* رأس القسم */
  const sectHeader = $('vl-sect-header');
  if (sectHeader) {
    sectHeader.innerHTML =
      `<i class="fa-solid ${cat.icon} vl-sect-header-icon"></i>` +
      `<span class="vl-sect-header-name">${cat.nameAr}</span>`;
  }

  /* شارة فوق الصورة */
  setText('vl-cat-badge', cat.nameAr);

  /* صفوف المنتجات */
  const sectRows = $('vl-sect-rows');
  if (!sectRows) return;
  sectRows.innerHTML = '';

  cat.visItems.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'vl-row';
    row.dataset.image = item.image || '';
    row.dataset.price = item.price != null ? String(item.price) : '';

    const num       = String(idx + 1).padStart(2, '0');
    const priceHtml = item.price != null
      ? `<span class="vl-row-price">${item.price} ريال</span>` : '';

    row.innerHTML =
      `<span class="vl-row-num">${num}</span>` +
      `<div class="vl-row-names">` +
        `<span class="vl-row-name-ar">${item.nameAr}</span>` +
        `<span class="vl-row-name-en">${item.nameEn || ''}</span>` +
      `</div>` +
      priceHtml;

    row.addEventListener('click', () => { _vlPause(); _vlHighlight(idx); });
    sectRows.appendChild(row);
  });

  /* زر القسم التالي — يعرض اسم القسم القادم */
  const nextLabel = $('vl-next-btn-label');
  if (nextLabel && _vlCats.length > 1) {
    const nextCat = _vlCats[(_vlCurCatIdx + 1) % _vlCats.length];
    if (nextCat) nextLabel.textContent = nextCat.nameAr;
  }
}

/* تحديث التمييز + الصورة */
function _vlHighlight(prodIdx) {
  const cat = _vlCats[_vlCurCatIdx];
  if (!cat || !cat.visItems.length) return;

  prodIdx = ((prodIdx % cat.visItems.length) + cat.visItems.length) % cat.visItems.length;
  _vlCurProdIdx = prodIdx;

  const rows = document.querySelectorAll('#vl-sect-rows .vl-row');
  rows.forEach((r, i) => r.classList.toggle('vl-active', i === prodIdx));

  const item = cat.visItems[prodIdx];
  if (!item) return;

  /* الصورة */
  const newSrc = item.image || '';
  const imgEl  = document.getElementById('vl-prod-img');
  const phEl   = document.getElementById('vl-prod-ph');
  const bgEl   = document.getElementById('vl-glass-bg');

  if (newSrc && newSrc !== _vlCurImgSrc) {
    _vlCurImgSrc = newSrc;
    clearTimeout(_vlImgFadeTimer);
    if (imgEl) {
      imgEl.classList.remove('vl-img-visible');
      _vlImgFadeTimer = setTimeout(() => {
        imgEl.src = newSrc;
        imgEl.style.display = 'block';
        if (phEl) phEl.style.display = 'none';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          imgEl.classList.add('vl-img-visible');
        }));
      }, 200);
    }
    if (bgEl) bgEl.style.backgroundImage = `url('${newSrc}')`;
  } else if (!newSrc) {
    _vlCurImgSrc = '';
    if (imgEl) { imgEl.classList.remove('vl-img-visible'); imgEl.style.display = 'none'; }
    if (phEl)  phEl.style.display = 'flex';
    if (bgEl)  bgEl.style.backgroundImage = '';
  }

  /* السعر */
  const priceBadge  = $('vl-price-badge');
  const priceBadgeN = $('vl-price-badge-num');
  if (priceBadge) {
    if (item.price != null) {
      if (priceBadgeN) priceBadgeN.textContent = item.price;
      priceBadge.style.display = 'inline-flex';
    } else {
      priceBadge.style.display = 'none';
    }
  }
}

function _vlStart() {
  if (!_vlCats.length) return;
  _vlCurCatIdx  = 0;
  _vlCurProdIdx = 0;
  _vlRenderCategory(0);
  _vlHighlight(0);
  _vlTimer = setTimeout(_vlStep, ITEM_DURATION);
}

function _vlStep() {
  clearTimeout(_vlTimer);
  if (_vlPaused) return;

  const cat = _vlCats[_vlCurCatIdx];
  if (!cat) return;

  const nextProdIdx = _vlCurProdIdx + 1;

  if (nextProdIdx >= cat.visItems.length) {
    /* انتهت منتجات هذا القسم → انتظر ثم انتقل للتالي */
    _vlTimer = setTimeout(_vlNextCat, ITEM_DURATION + 1200);
  } else {
    _vlHighlight(nextProdIdx);
    _vlTimer = setTimeout(_vlStep, ITEM_DURATION);
  }
}

/* الانتقال للقسم التالي (يُستدعى من الزر أو تلقائياً) */
function _vlNextCat() {
  if (!_vlCats.length) return;
  clearTimeout(_vlTimer);

  _vlCurCatIdx  = (_vlCurCatIdx + 1) % _vlCats.length;
  _vlCurProdIdx = 0;
  _vlCurImgSrc  = '';

  const sectDisplay = $('vl-section-display');
  if (sectDisplay) {
    sectDisplay.style.opacity   = '0';
    sectDisplay.style.transform = 'translateY(18px)';
    setTimeout(() => {
      _vlRenderCategory(_vlCurCatIdx);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        sectDisplay.style.opacity   = '1';
        sectDisplay.style.transform = 'translateY(0)';
        _vlHighlight(0);
      }));
    }, 360);
  } else {
    _vlRenderCategory(_vlCurCatIdx);
    _vlHighlight(0);
  }

  if (!_vlPaused) {
    _vlTimer = setTimeout(_vlStep, ITEM_DURATION + 1000);
  }
}
window._vlNextCat = _vlNextCat;

function _vlPause() {
  _vlPaused = true;
  clearTimeout(_vlTimer);
  clearTimeout(_vlPauseTimer2);
  _vlPauseTimer2 = setTimeout(_vlResume, PAUSE_DURATION);
}

function _vlResume() {
  _vlPaused = false;
  clearTimeout(_vlPauseTimer2);
  _vlHighlight(_vlCurProdIdx);
  _vlTimer = setTimeout(_vlStep, ITEM_DURATION);
}

/* إعادة بناء عند تغيير الإعدادات من الريموت */
function _vlRebuildIfActive() {
  const vl = document.getElementById('screen-vertical');
  if (vl && vl.style.display !== 'none') {
    clearTimeout(_vlTimer);
    _vlBuildCats();
    _vlStart();
  }
}

/* ════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* تحديد وضع العرض */
  const _layout = localStorage.getItem(LS_LAYOUT) || 'horizontal';
  const _screenH = document.querySelector('.screen:not(#screen-vertical)');
  const _screenV = document.getElementById('screen-vertical');

  if (_layout === 'vertical') {
    if (_screenH) _screenH.style.display = 'none';
    if (_screenV) _screenV.style.display = 'block';
  } else {
    if (_screenH) _screenH.style.display = '';
    if (_screenV) _screenV.style.display = 'none';
  }

  if (_layout !== 'vertical') {
    // ── الوضع الأفقي (كما هو) ──
    renderRestaurantInfo();
    renderCategoryTabs();
    _loadBadges();
    renderAllCategories();
    fixScrollablePadding();
    renderSlides();
  }

  // ── تحميل إعدادات المطور من الجلسة (مشترك بين الوضعين) ──
  _devLoadSettings();

  if (_layout === 'vertical') {
    // ── الوضع العمودي — العرض السينمائي (vmenu.js) ──
    _loadBadges();
    if (typeof window._vxInit === 'function') window._vxInit();
    applyDevSettings();   // تطبيق إعدادات الإخفاء على الأزرار العمودية

    // سر اللوغو العمودي: 3 ضغطات → تحديث، 5 ضغطات → لوحة التحكم
    (function _setupVlLogoTap() {
      const logoWrap = $('vl-logo-wrap');
      if (!logoWrap) return;
      let tapCount = 0, tapTimer = null, lastTouchEnd = 0;
      function onTap() {
        tapCount++;
        clearTimeout(tapTimer);
        _showUpdateToast(tapCount);
        if (tapCount >= 5) {
          tapCount = 0; _hideUpdateToast(); showDevPasswordModal(); return;
        }
        tapTimer = setTimeout(() => {
          if (tapCount === 3) _forceUpdateApp();
          tapCount = 0; _hideUpdateToast();
        }, 1200);
      }
      logoWrap.addEventListener('touchend', e => {
        e.preventDefault(); lastTouchEnd = Date.now(); onTap();
      }, { passive: false });
      logoWrap.addEventListener('click', () => {
        if (Date.now() - lastTouchEnd < 400) return; onTap();
      });
    })();

  } else {
    // ── الوضع الأفقي (كما هو) ──
    applyDevSettings();

    // Detect user interaction on the menu area
    const menuArea = $('menu-items-area');
    if (menuArea) {
      menuArea.addEventListener('touchstart', pauseAutoScroll, { passive: true });
      menuArea.addEventListener('touchmove',  pauseAutoScroll, { passive: true });
      menuArea.addEventListener('wheel',      pauseAutoScroll, { passive: true });
      menuArea.addEventListener('scroll', () => {
        if (!progScroll) pauseAutoScroll();
      }, { passive: true });
    }

    const tabsRow = $('category-tabs');
    if (tabsRow) {
      tabsRow.addEventListener('touchstart', pauseAutoScroll, { passive: true });
    }

    // Swipe على لوحة الصور لتغيير الشريحة يدوياً
    const slidesWrapper = $('slides-wrapper');
    if (slidesWrapper) {
      let swipeStartX = 0, swipeStartY = 0;
      slidesWrapper.addEventListener('touchstart', e => {
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
      }, { passive: true });
      slidesWrapper.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - swipeStartX;
        const dy = e.changedTouches[0].clientY - swipeStartY;
        if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
        if (dx < 0) goToSlide((curSlide + 1) % slides.length);
        else        goToSlide((curSlide - 1 + slides.length) % slides.length);
      }, { passive: true });
    }

    // Start auto-scroll
    setTimeout(startAutoScroll, 900);

    // سر اللوجو: 3 ضغطات → تحديث، 5 ضغطات → لوحة التحكم
    setupLogoSecretTap();
  }

  // ملاءمة الموقع لحجم الشاشة (مشترك)
  fitScreenToViewport();

  // مزامنة الإعدادات من الجهاز الآخر (مشترك)
  if (window.DuoSync && typeof window.DuoSync.listen === 'function') {
    window.DuoSync.listen(v => {
      applyRemoteSettings(v);
      // تحديث العرض العمودي إن كان مفعّلاً
      if (typeof window._vxRebuild === 'function') window._vxRebuild();
    });
  }

  // مؤشر البطارية (مشترك)
  initBattery();
});

/* ════════════════════════════════════════════════════════
   BATTERY STATUS
════════════════════════════════════════════════════════ */
function initBattery() {
  if (!navigator.getBattery) return;   // API غير مدعومة

  navigator.getBattery().then(bat => {
    _updateBattery(bat);

    bat.addEventListener('levelchange',   () => _updateBattery(bat));
    bat.addEventListener('chargingchange',() => _updateBattery(bat));
  });
}

function _updateBattery(bat) {
  const pct      = Math.round(bat.level * 100);
  const charging = bat.charging;

  // لون حسب الحالة
  const color =
    charging ? '#4ade80' :
    pct > 50 ? 'rgba(255,255,255,.75)' :
    pct > 20 ? '#fcd34d' : '#f87171';

  /* ── الوضع الأفقي ── */
  const widget = $('battery-widget');
  const boltEl = $('battery-bolt');
  const pctEl  = $('battery-pct');
  if (widget && pctEl) {
    pctEl.textContent   = pct + '%';
    pctEl.style.color   = color;
    pctEl.style.display = '';
    if (boltEl) { boltEl.style.display = charging ? 'inline' : 'none'; boltEl.style.color = color; }
    widget.classList.toggle('charging', charging);
    widget.classList.toggle('low',      !charging && pct <= 20);
    widget.style.display = 'flex';
    const sep = $('battery-sep');
    if (sep) sep.style.display = '';
  }

  /* ── الوضع العمودي ── */
  const widgetV = $('vl-battery-widget');
  const boltElV = $('vl-battery-bolt');
  const pctElV  = $('vl-battery-pct');
  if (widgetV && pctElV) {
    pctElV.textContent   = pct + '%';
    pctElV.style.color   = color;
    pctElV.style.display = '';
    if (boltElV) { boltElV.style.display = charging ? 'inline' : 'none'; boltElV.style.color = color; }
    widgetV.classList.toggle('charging', charging);
    widgetV.classList.toggle('low',      !charging && pct <= 20);
    widgetV.style.display = 'flex';
    const sepV = $('vl-battery-sep');
    if (sepV) sepV.style.display = '';
  }
}
