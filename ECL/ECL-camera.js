/**
 * ============================================================
 *  ECL-camera.js — وحدة الكاميرا المباشرة عبر WebRTC
 *  QB-Sentinel | Equipment Cleaning Log
 *  المطوّر: بلال الخواجة
 * ============================================================
 *
 *  المهام:
 *  1. فتح الكاميرا الخلفية مباشرةً عبر WebRTC (بدون input file)
 *  2. منع المعرض تماماً — الموظف يلتقط الصورة الآن فقط
 *  3. طبع Watermark تلقائي على الصورة يحتوي:
 *       • التاريخ والوقت الحالي (لحظة الالتقاط)
 *       • اسم الموظف المُنظِّف
 *       • اسم الجهاز المُنظَّف
 *  4. ضغط الصورة بعد الالتقاط
 *  5. تصدير الصورة النهائية Base64 للسكربت الرئيسي
 *
 *  الاستخدام في ECL-script.js:
 *       ECLCamera.init(config)  ← تهيئة الوحدة
 *       ECLCamera.open()        ← فتح الكاميرا
 *       ECLCamera.getImage()    ← جلب Base64 الصورة الملتقطة
 *       ECLCamera.reset()       ← إعادة الضبط الكامل
 * ============================================================
 */

const ECLCamera = (() => {

    // ─── الحالة الداخلية ───────────────────────────────────
    let _stream         = null;   // بث WebRTC
    let _capturedImage  = null;   // Base64 الصورة النهائية
    let _config         = {};     // إعدادات مُمررة من الخارج

    // ─── مراجع عناصر الـ DOM التي سنُنشئها ──────────────────
    let _overlay, _video, _canvas, _captureBtn, _closeBtn, _countdownEl;

    // ─── نص الزر بحالتيه ─────────────────────────────────
    const TEXT = {
        capture : { ar: '📸 التقاط', en: 'Capture' },
        retake  : { ar: '🔄 إعادة التصوير', en: 'Retake' },
        close   : { ar: '✕', en: '✕' },
        confirm : { ar: '✔ استخدام هذه الصورة', en: 'Use Photo' }
    };

    // ══════════════════════════════════════════════════════
    //  init — تهيئة الوحدة وبناء الـ overlay في DOM
    // ══════════════════════════════════════════════════════
    function init(config = {}) {
        _config = {
            onCapture     : config.onCapture     || (() => {}),   // callback عند التقاط ناجح
            onClose       : config.onClose       || (() => {}),   // callback عند الإغلاق
            maxWidth      : config.maxWidth      || 1024,
            maxHeight     : config.maxHeight     || 1024,
            quality       : config.quality       || 0.80,
            watermarkColor: config.watermarkColor|| 'rgba(255,255,255,0.92)',
            watermarkBg   : config.watermarkBg   || 'rgba(0,0,0,0.55)',
        };
        _buildOverlay();
    }

    // ══════════════════════════════════════════════════════
    //  open — طلب إذن الكاميرا وفتح نافذة البث
    // ══════════════════════════════════════════════════════
    async function open() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            _showError('متصفحك لا يدعم الكاميرا المباشرة.\nيرجى تحديث المتصفح أو استخدام Chrome / Safari.');
            return;
        }

        try {
            // نطلب الكاميرا الخلفية أولاً، ثم نتراجع لأي كاميرا
            _stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width     : { ideal: 1280 },
                    height    : { ideal: 720 }
                },
                audio: false
            });
        } catch (err) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                _showError('تم رفض إذن الكاميرا.\nيرجى السماح للمتصفح بالوصول إلى الكاميرا من إعدادات الهاتف.');
            } else if (err.name === 'NotFoundError') {
                _showError('لم يتم العثور على كاميرا في هذا الجهاز.');
            } else {
                _showError('تعذّر تشغيل الكاميرا: ' + err.message);
            }
            return;
        }

        // ربط البث بعنصر الفيديو
        _video.srcObject = _stream;
        await _video.play().catch(() => {});

        // إظهار الـ overlay وإعادة الضبط
        _capturedImage = null;
        _canvas.classList.add('ecl-cam--hidden');
        _video.classList.remove('ecl-cam--hidden');
        _setCaptureMode();
        _overlay.classList.remove('ecl-cam--hidden');
        _overlay.classList.add('ecl-cam--visible');
    }

    // ══════════════════════════════════════════════════════
    //  reset — إعادة الضبط الكامل
    // ══════════════════════════════════════════════════════
    function reset() {
        _stopStream();
        _capturedImage = null;
        _overlay.classList.remove('ecl-cam--visible');
        _overlay.classList.add('ecl-cam--hidden');
    }

    // ══════════════════════════════════════════════════════
    //  getImage — إرجاع الصورة الملتقطة
    // ══════════════════════════════════════════════════════
    function getImage() {
        return _capturedImage;
    }

    // ══════════════════════════════════════════════════════
    //  _buildOverlay — بناء نافذة الكاميرا في DOM
    // ══════════════════════════════════════════════════════
    function _buildOverlay() {
        // إزالة نسخة قديمة إن وُجدت
        const old = document.getElementById('eclCamOverlay');
        if (old) old.remove();

        // ─── Inject CSS ───────────────────────────────────
        if (!document.getElementById('eclCamStyle')) {
            const style = document.createElement('style');
            style.id = 'eclCamStyle';
            style.textContent = `
                /* ── Overlay المحسن ── */
#eclCamOverlay {
    position: fixed; inset: 0; z-index: 9999;
    background: #f3f4f6; /* لون خلفية الموقع */
    display: flex; flex-direction: column;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    direction: rtl;
}

/* ── Header يعكس الهوية ── */
.ecl-cam__header {
    width: 100%; padding: 20px 16px;
    background: linear-gradient(135deg, #c62828 0%, #8e0000 100%); /* نفس تدرج الهيدر الرئيسي */
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 4px 15px rgba(198, 40, 40, 0.2);
    border-radius: 0 0 20px 20px;
    z-index: 10;
}
.ecl-cam__title { color: #fff; font-size: 16px; font-weight: 700; }
.ecl-cam__title small { display: block; font-size: 10px; opacity: 0.8; letter-spacing: 1px; }

/* ── منطقة العرض (Video Container) ── */
.ecl-cam__viewport {
    flex: 1; position: relative; overflow: hidden;
    margin: 15px; border-radius: 20px;
    border: 3px solid #fff;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    background: #000;
}
#eclCamVideo, #eclCamCanvas {
    width: 100%; height: 100%; object-fit: cover;
}

/* ── شريط معلومات الـ Watermark (Preview) ── */
.ecl-cam__info-bar {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
    padding: 12px; border-top: 1px solid rgba(255,255,255,0.2);
}
.ecl-cam__info-bar span {
    color: #fff; font-size: 11px; display: block; margin-bottom: 2px;
}

/* ── شريط التحكم السفلي ── */
.ecl-cam__controls {
    padding: 20px; background: #fff;
    border-radius: 25px 25px 0 0;
    display: flex; align-items: center; justify-content: space-around;
    box-shadow: 0 -5px 20px rgba(0,0,0,0.05);
}

/* زر الالتقاط المصمم بعناية */
#eclCaptureBtn {
    width: 75px; height: 75px; border-radius: 50%;
    background: #fff; border: 6px solid #f3f4f6;
    box-shadow: 0 0 0 4px #c62828; /* تحديد باللون الأحمر */
    cursor: pointer; transition: 0.3s;
}
#eclCaptureBtn:active { transform: scale(0.9); }

/* زر التأكيد (يشبه submit-btn) */
#eclConfirmBtn {
    background: #c62828; color: #fff;
    border: none; border-radius: 12px;
    padding: 12px 25px; font-weight: 700;
    box-shadow: 0 4px 12px rgba(198, 40, 40, 0.2);
}

/* زر الإغلاق الأنيق */
#eclCloseBtn {
    background: rgba(255,255,255,0.2); color: #fff;
    border: none; border-radius: 10px; width: 35px; height: 35px;
}

                /* Utility */
                .ecl-cam--hidden { display: none !important; }
            `;
            document.head.appendChild(style);
        }

        // ─── HTML ─────────────────────────────────────────
        _overlay = document.createElement('div');
        _overlay.id = 'eclCamOverlay';
        _overlay.classList.add('ecl-cam--hidden');
        _overlay.innerHTML = `
    <div class="ecl-cam__header">
        <div class="ecl-cam__title">
            <span>📷 كاميرا التوثيق الذكية</span>
            <small>QB-SENTINEL LIVE SYSTEM</small>
        </div>
        <button id="eclCloseBtn">✕</button>
    </div>

    <div class="ecl-cam__viewport">
        <video id="eclCamVideo" autoplay playsinline muted></video>
        <canvas id="eclCamCanvas" class="ecl-cam--hidden"></canvas>
        
        <div id="eclCountdown" class="ecl-cam--hidden"></div>

        <div class="ecl-cam__info-bar" id="eclInfoBar">
            <span id="eclInfoTime"></span>
            <span id="eclInfoEmployee"></span>
            <span id="eclInfoEquipment"></span>
        </div>
    </div>

    <div class="ecl-cam__controls">
        <div style="width: 100px;"></div> <button id="eclCaptureBtn" title="التقاط"></button>
        <button id="eclConfirmBtn" class="hidden">استخدام الصورة</button>
    </div>
`;
        document.body.appendChild(_overlay);

        // ─── مراجع العناصر ────────────────────────────────
        _video       = document.getElementById('eclCamVideo');
        _canvas      = document.getElementById('eclCamCanvas');
        _captureBtn  = document.getElementById('eclCaptureBtn');
        _closeBtn    = document.getElementById('eclCloseBtn');
        _countdownEl = document.getElementById('eclCountdown');

        // ─── الأحداث ──────────────────────────────────────
        _captureBtn.addEventListener('click', _onCaptureBtnClick);
        document.getElementById('eclConfirmBtn').addEventListener('click', _onConfirmClick);
        _closeBtn.addEventListener('click', _onClose);

        // ─── تحديث شريط المعلومات كل ثانية ───────────────
        setInterval(_updateInfoBar, 1000);
    }

    // ══════════════════════════════════════════════════════
    //  _onCaptureBtnClick
    // ══════════════════════════════════════════════════════
    function _onCaptureBtnClick() {
        // إذا كنا في وضع "إعادة التصوير"
        if (_captureBtn.classList.contains('ecl-cam--retake')) {
            _retake();
            return;
        }
        // التقاط مع عدّ تنازلي 3-2-1
        _startCountdownThenCapture();
    }

    // ══════════════════════════════════════════════════════
    //  _startCountdownThenCapture — عدّ تنازلي ثم التقاط
    // ══════════════════════════════════════════════════════
    function _startCountdownThenCapture() {
        _captureBtn.disabled = true;
        _countdownEl.classList.remove('ecl-cam--hidden');

        let count = 3;
        _countdownEl.textContent = count;
        _countdownEl.style.opacity = '1';

        const tick = setInterval(() => {
            count--;
            if (count > 0) {
                _countdownEl.textContent = count;
            } else {
                clearInterval(tick);
                _countdownEl.style.opacity = '0';
                setTimeout(() => {
                    _countdownEl.classList.add('ecl-cam--hidden');
                    _capturePhoto();
                    _captureBtn.disabled = false;
                }, 300);
            }
        }, 1000);
    }

    // ══════════════════════════════════════════════════════
    //  _capturePhoto — رسم الإطار + Watermark على Canvas
    // ══════════════════════════════════════════════════════
    function _capturePhoto() {
        const vw = _video.videoWidth  || 640;
        const vh = _video.videoHeight || 480;

        // حساب أبعاد الضغط
        let w = vw, h = vh;
        const max = Math.max(_config.maxWidth, _config.maxHeight);
        if (w > max || h > max) {
            const ratio = Math.min(max / w, max / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }

        _canvas.width  = w;
        _canvas.height = h;
        const ctx = _canvas.getContext('2d');

        // 1. رسم إطار الفيديو
        ctx.drawImage(_video, 0, 0, w, h);

        // 2. رسم Watermark
        _drawWatermark(ctx, w, h);

        // 3. تحويل لـ Base64
        _capturedImage = _canvas.toDataURL('image/jpeg', _config.quality);

        // 4. إيقاف البث وعرض الصورة الملتقطة
        _stopStream();
        _video.classList.add('ecl-cam--hidden');
        _canvas.classList.remove('ecl-cam--hidden');

        // 5. تبديل الأزرار
        _setConfirmMode();
    }

    // ══════════════════════════════════════════════════════
    //  _drawWatermark — رسم شريط المعلومات على الصورة
    // ══════════════════════════════════════════════════════
    function _drawWatermark(ctx, w, h) {
        const { employeeName, equipmentName } = _getContextData();
        const now = new Date();
        const dateStr = now.toLocaleDateString('ar-SA', {
            weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
            timeZone: 'Asia/Riyadh'
        });
        const timeStr = now.toLocaleTimeString('ar-SA', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZone: 'Asia/Riyadh'
        });

        const lines = [
            `🕐  ${dateStr}  ${timeStr}`,
            `👤  ${employeeName || '—'}`,
            `🔧  ${equipmentName || '—'}`
        ];

        const fontSize  = Math.max(14, Math.round(w * 0.022));
        const lineH     = fontSize * 1.7;
        const padding   = fontSize * 0.8;
        const barH      = lines.length * lineH + padding * 2;
        const barY      = h - barH;

        // خلفية شبه شفافة
        ctx.fillStyle = _config.watermarkBg;
        ctx.fillRect(0, barY, w, barH);

        // النص
        ctx.font      = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
        ctx.fillStyle = _config.watermarkColor;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.direction = 'rtl';

        lines.forEach((line, i) => {
            ctx.fillText(line, w - padding, barY + padding + lineH * i + lineH / 2);
        });

        // شريط علوي صغير: شعار المشروع
        const topH = fontSize * 1.6;
        ctx.fillStyle = 'rgba(198,40,40,0.82)';
        ctx.fillRect(0, 0, w, topH);
        ctx.font      = `bold ${Math.round(fontSize * 0.9)}px "Segoe UI", Arial, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.direction = 'ltr';
        ctx.fillText('QB-Sentinel  |  Equipment Cleaning Log', w / 2, topH / 2);
    }

    // ══════════════════════════════════════════════════════
    //  _onConfirmClick — المستخدم يقبل الصورة
    // ══════════════════════════════════════════════════════
    function _onConfirmClick() {
        _overlay.classList.remove('ecl-cam--visible');
        _overlay.classList.add('ecl-cam--hidden');
        // استدعاء callback الخارجي مع الصورة
        _config.onCapture(_capturedImage);
    }

    // ══════════════════════════════════════════════════════
    //  _retake — إعادة التصوير
    // ══════════════════════════════════════════════════════
    async function _retake() {
        _capturedImage = null;
        _canvas.classList.add('ecl-cam--hidden');

        // إعادة فتح الكاميرا
        try {
            _stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            _video.srcObject = _stream;
            await _video.play().catch(() => {});
            _video.classList.remove('ecl-cam--hidden');
            _setCaptureMode();
        } catch (err) {
            _showError('تعذّر إعادة تشغيل الكاميرا: ' + err.message);
        }
    }

    // ══════════════════════════════════════════════════════
    //  _onClose
    // ══════════════════════════════════════════════════════
    function _onClose() {
        _stopStream();
        _capturedImage = null;
        _overlay.classList.remove('ecl-cam--visible');
        _overlay.classList.add('ecl-cam--hidden');
        _config.onClose();
    }

    // ══════════════════════════════════════════════════════
    //  _setCaptureMode / _setConfirmMode — تبديل الأزرار
    // ══════════════════════════════════════════════════════
    function _setCaptureMode() {
        _captureBtn.textContent = '📸';
        _captureBtn.title       = 'التقاط الصورة';
        _captureBtn.classList.remove('ecl-cam--retake');
        document.getElementById('eclConfirmBtn').style.display = 'none';
    }

    function _setConfirmMode() {
        _captureBtn.textContent = '🔄';
        _captureBtn.title       = 'إعادة التصوير';
        _captureBtn.classList.add('ecl-cam--retake');
        document.getElementById('eclConfirmBtn').style.display = 'inline-flex';
    }

    // ══════════════════════════════════════════════════════
    //  _updateInfoBar — تحديث شريط المعلومات الحي
    // ══════════════════════════════════════════════════════
    function _updateInfoBar() {
        const timeEl = document.getElementById('eclInfoTime');
        const empEl  = document.getElementById('eclInfoEmployee');
        const eqEl   = document.getElementById('eclInfoEquipment');
        if (!timeEl) return;

        const now = new Date();
        timeEl.textContent = '🕐  ' + now.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });

        const { employeeName, equipmentName } = _getContextData();
        empEl.textContent = '👤  ' + (employeeName || '— لم يُختر بعد');
        eqEl.textContent  = '🔧  ' + (equipmentName || '— لم يُختر بعد');
    }

    // ══════════════════════════════════════════════════════
    //  _getContextData — قراءة بيانات النموذج الحالية
    //  (الموظف + الجهاز) من الـ DOM مباشرة
    // ══════════════════════════════════════════════════════
    function _getContextData() {
        const empEl = document.querySelector('input[name="employeeName"]:checked');
        const eqEl  = document.querySelector('input[name="equipment"]:checked');

        const employeeName  = empEl ? empEl.value : null;
        const equipmentName = eqEl
            ? eqEl.closest('label')?.querySelector('span')?.innerText || eqEl.value
            : null;

        return { employeeName, equipmentName };
    }

    // ══════════════════════════════════════════════════════
    //  _stopStream — إيقاف بث الكاميرا
    // ══════════════════════════════════════════════════════
    function _stopStream() {
        if (_stream) {
            _stream.getTracks().forEach(t => t.stop());
            _stream = null;
        }
        if (_video) _video.srcObject = null;
    }

    // ══════════════════════════════════════════════════════
    //  _showError — عرض خطأ داخل الـ overlay
    // ══════════════════════════════════════════════════════
    function _showError(msg) {
        // محاولة استخدام modal المشروع إن وُجد
        const modal = document.getElementById('customModal');
        if (modal) {
            const title = document.getElementById('modalTitle');
            const message = document.getElementById('modalMessage');
            const close = document.getElementById('modalClose');
            const icon = document.getElementById('modalIcon');
            const loader = document.getElementById('modalLoader');
            if (title) title.innerText = 'خطأ في الكاميرا';
            if (message) message.innerText = msg;
            if (loader) loader.classList.add('hidden');
            if (close) close.classList.remove('hidden');
            if (icon) icon.innerHTML = '<i data-lucide="alert-circle" class="error-icon"></i>';
            modal.classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } else {
            alert(msg);
        }
    }

    // ─── الواجهة العامة ───────────────────────────────────
    return { init, open, reset, getImage };

})();