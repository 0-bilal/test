/**
 * status-image.js — «صورة التلفاز للمنيو» بمقاس 9:16 (1080×1920)
 * تعرض كل منتجات المنيو في صورة واحدة بنفس هوية المنيو (أسود + #be1e2d،
 * خط Tajawal/Poppins، بطاقات وشارات أسعار المنيو).
 *
 * الرسم يتم على <canvas> مباشرة (بدون مكتبات) — الصور كلها من نفس الموقع
 * فلا "تتلوّث" اللوحة ويمكن تصديرها PNG ومشاركتها من الآيباد.
 *
 * الاستخدام:
 *   const canvas = await DuoStatusImage.render({ isHidden, mealPriceHidden });
 *   const blob   = await DuoStatusImage.toBlob(canvas);
 */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const PAD = 48;

  const C = {
    red:    '#be1e2d',
    redDk:  '#8f1521',
    redLt:  '#d42435',
    redGlow:'rgba(190,30,45,.40)',
    redSoft:'rgba(190,30,45,.12)',
    redEdge:'rgba(190,30,45,.30)',
    bg:     '#070707',
    s1:     '#101010',
    s3:     '#222',
    b0:     'rgba(255,255,255,.06)',
    b1:     'rgba(255,255,255,.10)',
    white:  '#fff',
    gray:   '#888',
    dim:    'rgba(255,255,255,.55)',
    lite:   '#ccc',
  };

  const AR = "'Tajawal', sans-serif";
  const EN = "'Poppins', sans-serif";
  const FA = "'Font Awesome 6 Free'";
  const FAB = "'Font Awesome 6 Brands'";

  /* رموز Font Awesome المستخدمة في المنيو */
  const ICONS = {
    'fa-burger':          '\uf805',
    'fa-bowl-food':       '\ue4c6',
    'fa-glass-water':     '\ue4f4',
    'fa-bottle-droplet':  '\ue4c4',
    fire:     '\uf7e4',
    phone:    '\uf095',
    clock:    '\uf017',
    location: '\uf3c5',
    info:     '\uf05a',
    mobile:   '\uf3cf',
    instagram:'\uf16d',
    tiktok:   '\ue07b',
  };
  let _iconsOk = false;

  /* ── تحميل الخطوط قبل الرسم (وإلا يرسم الـ canvas بخط احتياطي) ── */
  async function _loadFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const sampleAr = 'ديو برجر الأطباق ريال وجبة 0123456789';
    const sampleEn = 'DUO Burger 0123456789 SAR';
    const jobs = [
      ['900 60px Tajawal', sampleAr], ['800 30px Tajawal', sampleAr],
      ['700 24px Tajawal', sampleAr], ['500 20px Tajawal', sampleAr],
      ['400 24px Poppins', sampleEn], ['700 30px Poppins', sampleEn],
      ['800 30px Poppins', sampleEn],
      [`900 30px ${FA}`, '\uf805'], [`400 30px ${FAB}`, '\uf16d'],
    ];
    await Promise.all(jobs.map(([f, t]) => document.fonts.load(f, t).catch(() => null)));
    // fonts.check() يُرجع true حتى لو لم يُعرَّف الخط أصلاً — نتحقق من وجوده محمّلاً
    try {
      _iconsOk = [...document.fonts].some(f => /Font Awesome 6 Free/.test(f.family) && f.status === 'loaded');
    } catch (e) { _iconsOk = false; }
  }

  function _loadImg(src) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const img = new Image();
      img.decoding = 'async';
      img.onload  = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  /* ── أدوات رسم ── */
  function _rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function _font(ctx, weight, size, fam) { ctx.font = `${weight} ${size}px ${fam}`; }

  function _text(ctx, str, x, y, { weight = 700, size = 24, fam = AR, color = C.white,
                                   align = 'right', dir = 'rtl', base = 'alphabetic',
                                   maxW = 0, spacing = 0 } = {}) {
    ctx.direction = dir;          // قبل ctx.font — Chromium يربط الاتجاه بحالة الخط
    _font(ctx, weight, size, fam);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = base;
    if ('letterSpacing' in ctx) ctx.letterSpacing = spacing ? spacing + 'px' : '0px';
    if (maxW) str = _ellipsis(ctx, str, maxW);
    ctx.fillText(str, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    return ctx.measureText(str).width;
  }

  function _ellipsis(ctx, str, maxW) {
    if (ctx.measureText(str).width <= maxW) return str;
    let s = str;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s.trim() + '…';
  }

  function _icon(ctx, key, x, y, size, color, align = 'center') {
    if (!_iconsOk || !ICONS[key]) return 0;
    const brand = key === 'instagram' || key === 'tiktok';
    _font(ctx, brand ? 400 : 900, size, brand ? FAB : FA);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.direction = 'ltr';
    ctx.fillText(ICONS[key], x, y);
    return ctx.measureText(ICONS[key]).width;
  }

  function _imgCover(ctx, img, x, y, w, h, r) {
    ctx.save();
    _rr(ctx, x, y, w, h, r);
    ctx.clip();
    if (img) {
      const s = Math.max(w / img.width, h / img.height);
      const iw = img.width * s, ih = img.height * s;
      ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    } else {
      ctx.fillStyle = C.s3;
      ctx.fillRect(x, y, w, h);
      _icon(ctx, 'fa-burger', x + w / 2, y + h / 2, Math.min(w, h) * .34, C.gray);
    }
    ctx.restore();
  }

  /* شارة السعر الحمراء — مثل .item-price-badge
     ترسم من اليسار (x = الحافة اليسرى) وتُرجع العرض */
  function _priceWidth(ctx, price, size) {
    _font(ctx, 800, size, EN);
    const nw = ctx.measureText(String(price)).width;
    _font(ctx, 500, Math.round(size * .45), AR);
    const cw = ctx.measureText('ريال').width;
    return Math.max(nw, cw) + size * 1.4;
  }
  function _pricePill(ctx, x, y, price, { size = 30, h = 0, meal = false, mealLabel = 'وجبة' } = {}) {
    const w = Math.max(_priceWidth(ctx, price, size), meal ? size * 3.1 : 0);
    h = h || size * 2.05;
    ctx.save();
    ctx.shadowColor = C.redGlow; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
    _rr(ctx, x, y, w, h, h / 2);
    if (meal) {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#d4283a'); g.addColorStop(1, C.redDk);
      ctx.fillStyle = g;
    } else ctx.fillStyle = C.red;
    ctx.fill();
    ctx.restore();
    if (meal) {
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5;
      _rr(ctx, x, y, w, h, h / 2); ctx.stroke();
    }
    const cx = x + w / 2;
    if (meal) {
      _text(ctx, mealLabel, cx, y + h * .36, { weight: 800, size: Math.round(size * .5), align: 'center', base: 'middle' });
      _text(ctx, String(price), cx, y + h * .68, { weight: 800, size: Math.round(size * .82), fam: EN, align: 'center', dir: 'ltr', base: 'middle' });
    } else {
      _text(ctx, String(price), cx, y + h * .42, { weight: 800, size, fam: EN, align: 'center', dir: 'ltr', base: 'middle' });
      _text(ctx, 'ريال', cx, y + h * .78, { weight: 500, size: Math.round(size * .45), color: 'rgba(255,255,255,.82)', align: 'center', base: 'middle' });
    }
    return w;
  }

  /* ════════════════════════════════════════════════
     تخطيط المحتوى — كل فئة تُقسَّم لكتل بارتفاعات معروفة
     ثم يُصغَّر المحتوى كله تلقائياً إن لم يتسع في الصورة
  ════════════════════════════════════════════════ */
  const H_HEAD   = 62;   // عنوان الفئة
  const H_FEAT   = 168;  // بطاقة منتج رئيسي
  const H_TILE   = 278;  // بطاقة صورة (3 بالصف)
  const H_ROW    = 78;   // صف مختصر (2 بالصف)
  const GAP      = 14;
  const SEC_GAP  = 16;

  function _planCategory(cat, items) {
    const blocks = [{ type: 'head', cat, h: H_HEAD }];
    const featured = items.some(it => it.mealPrice != null);
    const withImg  = items.filter(it => it.image);
    const noImg    = items.filter(it => !it.image);
    const allImg   = noImg.length === 0;

    if (featured) {
      withImg.forEach(it => blocks.push({ type: 'feat', item: it, h: H_FEAT }));
      // الإضافات (بلا صورة) بعرض كامل مثل بطاقات البرجر فوقها
      noImg.forEach(it => blocks.push({ type: 'rows', items: [it], cols: 1, h: H_ROW }));
    } else if (allImg && items.length <= 3) {
      blocks.push({ type: 'tiles', items, h: H_TILE });
    } else {
      for (let i = 0; i < items.length; i += 2) blocks.push({ type: 'rows', items: items.slice(i, i + 2), h: H_ROW });
    }
    return blocks;
  }

  function _blocksHeight(blocks) {
    let h = 0;
    blocks.forEach((b, i) => {
      if (b.type === 'head' && i > 0) h += SEC_GAP;
      h += b.h + (b.type === 'head' ? 0 : GAP);
    });
    return h;
  }

  /* ── رسم الكتل ── */
  function _drawHead(ctx, b, x, y, w) {
    const r = x + w;
    let tx = r;
    if (_iconsOk) { _icon(ctx, b.cat.icon, r - 16, y + H_HEAD / 2, 30, C.red); tx = r - 46; }
    const tw = _text(ctx, b.cat.nameAr, tx, y + H_HEAD / 2 + 2, { weight: 800, size: 34, color: C.red, base: 'middle' });
    const lx2 = tx - tw - 18;
    const g = ctx.createLinearGradient(lx2, 0, x, 0);
    g.addColorStop(0, C.redEdge); g.addColorStop(1, 'rgba(190,30,45,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y + H_HEAD / 2, lx2 - x, 2);
  }

  function _card(ctx, x, y, w, h, accent) {
    _rr(ctx, x, y, w, h, 22);
    ctx.fillStyle = C.s1; ctx.fill();
    ctx.strokeStyle = C.b0; ctx.lineWidth = 1.5; ctx.stroke();
    if (accent) {
      ctx.fillStyle = C.red;
      _rr(ctx, x + w - 4, y + h * .2, 4, h * .6, 2); ctx.fill();
    }
  }

  function _drawFeat(ctx, b, x, y, w, imgs, opts) {
    const it = b.item, h = b.h;
    _card(ctx, x, y, w, h, true);
    const ip = 14, isz = h - ip * 2;
    _imgCover(ctx, imgs.get(it.image), x + w - ip - isz, y + ip, isz, isz, 16);

    // الأسعار — يسار البطاقة
    let px = x + 22;
    const showMeal = it.mealPrice != null && !opts.mealPriceHidden;
    const pillH = 84, py = y + (h - pillH) / 2;
    const pw = _pricePill(ctx, px, py, it.price, { size: 36, h: pillH });
    px += pw + 12;
    if (showMeal) px += _pricePill(ctx, px, py, it.mealPrice, { size: 36, h: pillH, meal: true }) + 12;

    // النصوص — يمين البطاقة بجانب الصورة
    const tr = x + w - ip - isz - 24;
    const maxW = tr - px - 10;
    _text(ctx, it.nameAr, tr, y + 56, { weight: 800, size: 38, maxW });
    _text(ctx, it.nameEn || '', tr, y + 90, { weight: 400, size: 19, fam: EN, color: C.gray, dir: 'ltr', maxW });
    const desc = it.descriptionAr || '';
    if (desc) _text(ctx, desc, tr, y + 124, { weight: 500, size: 20, color: C.dim, maxW });
    if (it.calories) _calBadge(ctx, tr, y + (desc ? 136 : 106), it.calories);
  }

  function _calBadge(ctx, r, y, cal) {
    const label = `${cal} سعرة`;
    _font(ctx, 500, 16, AR);
    const tw = ctx.measureText(label).width;
    const w = tw + (_iconsOk ? 44 : 28), h = 26;
    _rr(ctx, r - w, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill();
    ctx.strokeStyle = C.b1; ctx.lineWidth = 1; ctx.stroke();
    if (_iconsOk) _icon(ctx, 'fire', r - 16, y + h / 2 + 1, 13, '#f0a500');
    _text(ctx, label, r - (_iconsOk ? 30 : 14), y + h / 2 + 1, { weight: 500, size: 16, color: C.gray, base: 'middle' });
  }

  function _drawTiles(ctx, b, x, y, w, imgs) {
    const n = 3, g = 16;
    const tw = (w - g * (n - 1)) / n, h = b.h;
    b.items.forEach((it, i) => {
      const tx = x + w - (i + 1) * tw - i * g;   // من اليمين لليسار
      _card(ctx, tx, y, tw, h, false);
      const ip = 10, ih = 168;
      _imgCover(ctx, imgs.get(it.image), tx + ip, y + ip, tw - ip * 2, ih, 14);
      const cx = tx + tw / 2;
      _text(ctx, it.nameAr, cx, y + ip + ih + 38, { weight: 800, size: 27, align: 'center', maxW: tw - 24 });
      _text(ctx, it.nameEn || '', cx, y + ip + ih + 64, { weight: 400, size: 15, fam: EN, color: C.gray, align: 'center', dir: 'ltr', maxW: tw - 24 });
      // شارة السعر في زاوية الصورة
      _pricePill(ctx, tx + ip + 10, y + ip + ih - 66, it.price, { size: 26, h: 56 });
    });
  }

  function _drawRows(ctx, b, x, y, w, imgs, opts) {
    const g = 14, n = b.cols || 2;
    const rw = (w - g * (n - 1)) / n, h = b.h;
    b.items.forEach((it, i) => {
      const rx = x + w - (i + 1) * rw - i * g;
      _card(ctx, rx, y, rw, h, n === 1);   // بعرض كامل: نفس الخط الأحمر لبطاقات البرجر
      let tr = rx + rw - 18;
      if (it.image) {
        const isz = h - 16;
        _imgCover(ctx, imgs.get(it.image), rx + rw - 8 - isz, y + 8, isz, isz, 12);
        tr = rx + rw - 8 - isz - 14;
      }
      const pillH = 54;
      const pw = _pricePill(ctx, rx + 12, y + (h - pillH) / 2, it.price, { size: 24, h: pillH });
      const maxW = tr - (rx + 12 + pw) - 12;
      const variants = (it.variants || []).filter(v => !opts.isHidden(opts.catId(it), it, v));
      if (variants.length) {
        _text(ctx, it.nameAr, tr, y + 34, { weight: 800, size: 25, maxW });
        _text(ctx, variants.join(' · '), tr, y + 62, { weight: 500, size: 16, color: C.dim, maxW });
      } else {
        _text(ctx, it.nameAr, tr, y + h / 2 - 2, { weight: 800, size: 25, maxW, base: 'middle' });
        _text(ctx, it.nameEn || '', tr, y + h / 2 + 22, { weight: 400, size: 13, fam: EN, color: C.gray, dir: 'ltr', maxW, base: 'middle' });
      }
    });
  }

  /* ── الهيدر — نفس .menu-header ── */
  function _drawHeader(ctx, info, logo) {
    const hh = 168;               // هيدر مضغوط — مساحة أكبر للمنتجات
    const g = ctx.createLinearGradient(W, 0, 0, hh);
    g.addColorStop(0, '#1c0005'); g.addColorStop(.5, '#0d0000'); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hh);

    const rg = ctx.createRadialGradient(W - 40, 20, 0, W - 40, 20, 280);
    rg.addColorStop(0, C.redGlow); rg.addColorStop(1, 'rgba(190,30,45,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, hh);

    // الشعار في دائرة بإطار أحمر
    const d = 112, cx = W - PAD - d / 2, cy = hh / 2 - 1;
    ctx.save();
    ctx.shadowColor = C.redGlow; ctx.shadowBlur = 28;
    ctx.beginPath(); ctx.arc(cx, cy, d / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = C.red; ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, d / 2 - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = C.s3; ctx.fillRect(cx - d / 2, cy - d / 2, d, d);
    if (logo) ctx.drawImage(logo, cx - d / 2, cy - d / 2, d, d);
    else _icon(ctx, 'fa-burger', cx, cy, 48, C.red);
    ctx.restore();

    const tr = W - PAD - d - 26;
    _text(ctx, info.nameAr || '', tr, 70, { weight: 900, size: 48 });
    _text(ctx, (info.nameEn || '').toUpperCase(), tr, 100, { weight: 400, size: 16, fam: EN, color: C.gray, dir: 'ltr', spacing: 5 });
    _text(ctx, info.taglineAr || '', tr, 136, { weight: 500, size: 21, color: C.redLt });

    // شارة "المنيو" على اليسار
    const bw = 132, bh = 50, bx = PAD, by = hh / 2 - 38;
    ctx.save();
    ctx.shadowColor = C.redGlow; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
    _rr(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = C.red; ctx.fill();
    ctx.restore();
    _text(ctx, 'المنيو', bx + bw / 2, by + bh / 2 + 2, { weight: 900, size: 25, align: 'center', base: 'middle' });
    _text(ctx, 'MENU', bx + bw / 2, by + bh + 26, { weight: 600, size: 14, fam: EN, color: C.gray, align: 'center', dir: 'ltr', spacing: 8 });

    // الحد الأحمر + الشريط المتدرّج
    ctx.fillStyle = C.red; ctx.fillRect(0, hh - 2, W, 2);
    const sg = ctx.createLinearGradient(W, 0, 0, 0);
    sg.addColorStop(0, C.redDk); sg.addColorStop(.33, C.red); sg.addColorStop(.66, C.redLt); sg.addColorStop(1, 'rgba(212,36,53,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, hh, W, 4);
    return hh + 4;
  }

  /* ── الفوتر: التواصل + باركود منيو الجوال ──
     كل عنصر يمكن إخفاؤه من لوحة التحكم، وارتفاع الفوتر يتبع ما هو ظاهر */
  const QR_BOX = 200, QR_LABEL = 40;

  /* قيمة معدّلة من لوحة التحكم إن وُجدت (حتى لو فارغة)، وإلا قيمة products.js */
  const _val = (v, def) => (v != null ? String(v) : (def || '')).trim();

  function _footerRows(info, f) {
    const rows = [];
    const phone = _val(f.phoneText, info.phone);
    if (f.phone && phone) rows.push({ type: 'phone', h: 62, text: phone });
    const hours = (f.hoursText != null ? f.hoursText : info.workingHours) || '';
    const days  = (f.daysText  != null ? f.daysText  : info.workingDays)  || '';
    if (f.hours && (hours || days)) rows.push({ type: 'hours', h: 44, text: [hours, days].filter(Boolean).join(' · ') });
    const address = _val(f.addressText, info.address);
    if (f.address && address) rows.push({ type: 'address', h: 44, text: address });
    const ig = _val(f.instagramText, info.instagram).replace(/@/g, '');
    const tt = _val(f.tiktokText,    info.tiktok).replace(/@/g, '');
    const social = [];
    if (f.social && ig) social.push(['instagram', ig]);
    if (f.social && tt) social.push(['tiktok',    tt]);
    if (social.length) rows.push({ type: 'social', h: 44, items: social });
    if (info.taxNote) rows.push({ type: 'tax', h: 30, text: info.taxNote });
    return rows;
  }

  function _footerHeight(rows, qr) {
    const rowsH = rows.reduce((s, r) => s + r.h, 0) + Math.max(0, rows.length - 1) * 10;
    return Math.max(rowsH, qr ? QR_BOX + QR_LABEL : 0) + 52;
  }

  function _drawFooter(ctx, rows, qr, fh) {
    const fy = H - fh;
    const g = ctx.createLinearGradient(0, fy, 0, H);
    g.addColorStop(0, C.bg); g.addColorStop(1, '#140003');
    ctx.fillStyle = g; ctx.fillRect(0, fy, W, fh);
    const lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, 'rgba(190,30,45,0)'); lg.addColorStop(.15, C.red); lg.addColorStop(.85, C.red); lg.addColorStop(1, 'rgba(190,30,45,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, fy, W, 2);

    // باركود منيو الجوال — يسار الفوتر داخل إطار أبيض بحد أحمر
    let left = PAD;
    if (qr) {
      const qx = PAD, qy = fy + 26;
      ctx.save();
      ctx.shadowColor = C.redGlow; ctx.shadowBlur = 24;
      _rr(ctx, qx, qy, QR_BOX, QR_BOX, 20); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();
      ctx.strokeStyle = C.red; ctx.lineWidth = 4;
      _rr(ctx, qx, qy, QR_BOX, QR_BOX, 20); ctx.stroke();
      const ip = 14;
      ctx.imageSmoothingEnabled = false;            // حواف الباركود حادة لسهولة المسح
      ctx.drawImage(qr, qx + ip, qy + ip, QR_BOX - ip * 2, QR_BOX - ip * 2);
      ctx.imageSmoothingEnabled = true;
      const ly = qy + QR_BOX + 26;
      const shift = _iconsOk ? 14 : 0;           // مساحة أيقونة الجوال يمين النص
      const lw = _text(ctx, 'امسح لمنيو الجوال', qx + QR_BOX / 2 - shift, ly, { weight: 800, size: 21, align: 'center', base: 'middle' });
      if (_iconsOk) _icon(ctx, 'mobile', qx + QR_BOX / 2 - shift + lw / 2 + 16, ly, 20, C.red);
      left = PAD + QR_BOX + 36;
    }

    // صفوف المعلومات — يمين الفوتر
    const rowsH = rows.reduce((s, r) => s + r.h, 0) + Math.max(0, rows.length - 1) * 10;
    const contentH = Math.max(rowsH, qr ? QR_BOX + QR_LABEL : 0);
    let y = fy + 26 + (contentH - rowsH) / 2;
    const R = W - PAD, maxW = R - left;
    rows.forEach(r => {
      const cy = y + r.h / 2;
      if (r.type === 'phone') {
        _font(ctx, 700, 32, EN);
        const pw = ctx.measureText(r.text).width + (_iconsOk ? 86 : 50);
        _rr(ctx, R - pw, y, pw, r.h, r.h / 2);
        ctx.fillStyle = C.redSoft; ctx.fill();
        ctx.strokeStyle = C.redEdge; ctx.lineWidth = 1.5; ctx.stroke();
        if (_iconsOk) _icon(ctx, 'phone', R - 36, cy, 25, C.red);
        _text(ctx, r.text, R - (_iconsOk ? 62 : 25), cy + 2, { weight: 700, size: 32, fam: EN, dir: 'ltr', base: 'middle' });
      } else if (r.type === 'hours' || r.type === 'address') {
        let tx = R;
        if (_iconsOk) { _icon(ctx, r.type === 'hours' ? 'clock' : 'location', R - 14, cy, 24, C.red); tx = R - 40; }
        _text(ctx, r.text, tx, cy + 2, { weight: 700, size: 25, base: 'middle', maxW: tx - left });
      } else if (r.type === 'social') {
        let tx = R;
        r.items.forEach(([ico, label]) => {
          if (_iconsOk) { _icon(ctx, ico, tx - 14, cy, 24, C.red); tx -= 40; }
          const tw = _text(ctx, '@' + label, tx, cy + 2, { weight: 500, size: 21, fam: EN, color: C.lite, dir: 'ltr', base: 'middle', maxW: (maxW / r.items.length) - 50 });
          tx -= tw + 34;
        });
      } else if (r.type === 'tax') {
        let tx = R;
        if (_iconsOk) { _icon(ctx, 'info', R - 10, cy, 16, C.gray); tx = R - 28; }
        _text(ctx, r.text, tx, cy + 1, { weight: 500, size: 18, color: C.gray, base: 'middle', maxW: tx - left });
      }
      y += r.h + 10;
    });
  }

  /* ════════════════════════════════════════════════
     الرسم الكامل
  ════════════════════════════════════════════════ */
  async function render(opts = {}) {
    const info = opts.info || (typeof restaurantInfo !== 'undefined' ? restaurantInfo : {});
    const cats = opts.categories || (typeof menuCategories !== 'undefined' ? menuCategories : []);
    const isHidden = opts.isHidden || (() => false);
    const o = {
      mealPriceHidden: !!opts.mealPriceHidden,
      isHidden,
      catId: it => (cats.find(c => c.items.includes(it)) || {}).id,
    };

    // الفئات والمنتجات الظاهرة فقط
    const visible = cats
      .map(cat => ({ cat, items: cat.items.filter(it => !isHidden(cat.id, it)) }))
      .filter(x => x.items.length);

    await _loadFonts();
    const srcs = new Set();
    visible.forEach(x => x.items.forEach(it => it.image && srcs.add(it.image)));
    const imgs = new Map();
    await Promise.all([...srcs].map(async s => imgs.set(s, await _loadImg(s))));
    const logo = (await _loadImg(info.logo || 'images/logo.ico')) || (await _loadImg('icons/icon-512.png'));

    // خيارات الفوتر (من لوحة التحكم) — الافتراضي: كل شيء ظاهر
    const f = Object.assign({ phone: true, hours: true, address: true, social: true, qr: true }, opts.footer || {});
    const qr = f.qr ? await _loadImg(f.qrSrc || 'images/mobile-menu-qr.png') : null;
    const rows = _footerRows(info, f);
    const fh = _footerHeight(rows, qr);

    const canvas = opts.canvas || document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const top = _drawHeader(ctx, info, logo);

    // تخطيط المحتوى ثم ملاءمته للمساحة المتاحة
    const blocks = [];
    visible.forEach(({ cat, items }) => blocks.push(..._planCategory(cat, items)));
    const areaTop = top + 22, areaBot = H - fh - 18;
    const avail = areaBot - areaTop;
    const need = _blocksHeight(blocks) - GAP;
    const scale = Math.min(1, avail / need);
    const cw = (W - PAD * 2) / scale;            // عرض المحتوى قبل التصغير
    const ox = (W - cw * scale) / 2;
    const oy = areaTop + Math.max(0, (avail - need * scale) / 2);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    let y = 0;
    blocks.forEach((b, i) => {
      if (b.type === 'head' && i > 0) y += SEC_GAP;
      if (b.type === 'head')  _drawHead(ctx, b, 0, y, cw);
      if (b.type === 'feat')  _drawFeat(ctx, b, 0, y, cw, imgs, o);
      if (b.type === 'tiles') _drawTiles(ctx, b, 0, y, cw, imgs);
      if (b.type === 'rows')  _drawRows(ctx, b, 0, y, cw, imgs, o);
      y += b.h + (b.type === 'head' ? 0 : GAP);
    });
    ctx.restore();

    _drawFooter(ctx, rows, qr, fh);
    return canvas;
  }

  function toBlob(canvas, type = 'image/png') {
    return new Promise(resolve => canvas.toBlob(resolve, type, .95));
  }

  window.DuoStatusImage = { render, toBlob, WIDTH: W, HEIGHT: H };
})();
