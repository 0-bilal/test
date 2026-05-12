document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOcrP9pM8GwyX7clkYfK0C3x5GmbXfDnpwYaziSWgdxWauNII9tJ0yHJnMme9ljEEd/exec';

    let currentMode = 'IN';
    let deviceId    = localStorage.getItem('QB_DEVICE_ID');
    let branchName  = localStorage.getItem('QB_BRANCH_NAME');
    let qrTimer     = null;
    let qrInstance  = null;

    const els = {
        setupScreen:   document.getElementById('setupScreen'),
        deviceInput:   document.getElementById('deviceIdInput'),
        saveSetupBtn:  document.getElementById('saveSetupBtn'),
        setupStatus:   document.getElementById('setupStatus'),       // عنصر لعرض حالة التسجيل
        deviceDisplay: document.getElementById('deviceDisplay'),
        timestamp:     document.getElementById('timestamp'),
        selectionView: document.getElementById('selectionView'),
        qrView:        document.getElementById('qrView'),
        qrContainer:   document.getElementById('qrContainer'),
        qrModeBadge:   document.getElementById('qrModeBadge'),
        qrModeIcon:    document.getElementById('qrModeIcon'),
        qrModeLabel:   document.getElementById('qrModeLabel'),
        qrModeSub:     document.getElementById('qrModeSub'),
        timerFill:     document.getElementById('timerFill'),
        qrCard:        document.getElementById('qrView')?.querySelector('.qr-card'),
    };

    // ===================================================
    // التحقق من الجلسة
    // ===================================================
    if (!deviceId || !branchName) {
        els.setupScreen.classList.remove('hidden');
    } else {
        initMainSystem();
    }

    // ===================================================
    // حفظ إعداد الجهاز
    // المشكلة الأصلية: no-cors لا يُعيد استجابة مقروءة
    // الحل: JSONP عبر doGet لجلب اسم الفرع العربي
    // ===================================================
    els.saveSetupBtn.onclick = async () => {
        const input = els.deviceInput.value.trim();
        if (!input) return;

        // تعطيل الزر أثناء المعالجة
        els.saveSetupBtn.disabled = true;
        setSetupStatus('loading', 'جاري التحقق من الجهاز...');

        try {
            // الخطوة 1: جلب معلومات الجهاز
            const device = await getDeviceInfo();

            // الخطوة 2: إرسال بيانات التسجيل (no-cors كما هو)
            await fetch(SCRIPT_URL, {
                method:  'POST',
                mode:    'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action:    'REGISTER_DEVICE',
                    deviceId:  input,
                    ip:        device.ip,
                    location:  device.loc,
                    userAgent: navigator.userAgent,
                    screenRes: `${window.screen.width}x${window.screen.height}`
                })
            });

            // الخطوة 3: جلب اسم الفرع العربي عبر JSONP (doGet)
            // هذا يتجاوز مشكلة no-cors لأن JSONP يعمل عبر <script>
            const branchAr = await fetchBranchNameViaJsonp(SCRIPT_URL, input);

            // الخطوة 4: حفظ البيانات في localStorage
            localStorage.setItem('QB_DEVICE_ID',   input);
            localStorage.setItem('QB_BRANCH_NAME', branchAr);

            setSetupStatus('success', `✅ تم التسجيل — ${branchAr}`);

            // الانتقال للنظام بعد ثانية
            setTimeout(() => {
                deviceId   = input;
                branchName = branchAr;
                els.setupScreen.classList.add('hidden');
                initMainSystem();
            }, 1200);

        } catch (err) {
            console.error("Setup error:", err);
            setSetupStatus('error', '⚠️ تعذر الاتصال. يُرجى التحقق من الاتصال والمحاولة مجدداً.');
            els.saveSetupBtn.disabled = false;
        }
    };

    // ===================================================
    // جلب اسم الفرع عبر JSONP
    // ===================================================
    function fetchBranchNameViaJsonp(scriptUrl, deviceId) {
        return new Promise((resolve, reject) => {
            const callbackName = 'QB_CB_' + Date.now();
            const timeout = setTimeout(() => {
                cleanup();
                // إذا فشل JSONP، نستخدم القاموس المحلي كاحتياط
                resolve(getLocalBranchName(deviceId));
            }, 8000);

            window[callbackName] = function(data) {
                clearTimeout(timeout);
                cleanup();
                if (data && data.status === 'SUCCESS' && data.branchAr) {
                    resolve(data.branchAr);
                } else {
                    resolve(getLocalBranchName(deviceId));
                }
            };

            function cleanup() {
                delete window[callbackName];
                const script = document.getElementById('jsonp_script');
                if (script) script.remove();
            }

            const url = `${scriptUrl}?action=GET_BRANCH_NAME&deviceId=${encodeURIComponent(deviceId)}&callback=${callbackName}`;
            const script = document.createElement('script');
            script.id  = 'jsonp_script';
            script.src = url;
            script.onerror = () => {
                clearTimeout(timeout);
                cleanup();
                resolve(getLocalBranchName(deviceId));
            };
            document.head.appendChild(script);
        });
    }

    // قاموس احتياطي محلي
    function getLocalBranchName(deviceId) {
        const map = {
            'Muzahmiyah': 'المزاحمية',
            'muzahmiyah': 'المزاحمية',
            'Dawadimi':   'الدوادمي',
            'dawadimi':   'الدوادمي',
        };
        return map[deviceId] || deviceId;
    }

    // ===================================================
    // إظهار حالة الإعداد
    // ===================================================
    function setSetupStatus(type, msg) {
        if (!els.setupStatus) return;
        els.setupStatus.className = 'setup-status ' + type;
        els.setupStatus.innerText = msg;
        els.setupStatus.classList.remove('hidden');
    }

    // ===================================================
    // تشغيل النظام الرئيسي
    // ===================================================
    function initMainSystem() {
        els.deviceDisplay.innerText = `فرع: ${branchName}`;
        setInterval(updateTime, 1000);
        updateTime();
    }

    // ===================================================
    // الساعة
    // ===================================================
    function updateTime() {
        const now = new Date();
        els.timestamp.innerText = now.toLocaleTimeString('en-GB', { hour12: false });
    }

    // ===================================================
    // تفعيل الوضع (حضور / انصراف)
    // ===================================================
    window.activateMode = function(mode) {
        currentMode = mode;

        const selView   = els.selectionView;
        const qrView    = els.qrView;
        const qrCard    = qrView.querySelector('.qr-card');
        const timerFill = els.timerFill;

        const isIn = (mode === 'IN');

        els.qrModeBadge.className = 'qr-mode-badge ' + (isIn ? 'in-mode' : 'out-mode');
        els.qrModeIcon.setAttribute('data-lucide', isIn ? 'log-in' : 'log-out');
        els.qrModeLabel.innerText = isIn ? 'تسجيل حضور'  : 'تسجيل انصراف';
        els.qrModeSub.innerText   = isIn ? 'Check-In'     : 'Check-Out';

        if (qrCard)    qrCard.className = 'qr-card ' + (isIn ? 'in-mode' : 'out-mode');
        if (timerFill) timerFill.classList.toggle('in-mode', isIn);

        lucide.createIcons();

        selView.style.animation = 'fadeSlideDown 0.3s ease forwards';
        setTimeout(() => {
            selView.classList.add('hidden');
            selView.style.animation = '';
            generateQR();
            qrView.classList.remove('hidden');
            qrView.style.animation = 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both';
        }, 280);
    };

    // ===================================================
    // جلب معلومات الجهاز
    // ===================================================
    async function getDeviceInfo() {
        let info = { ip: "0.0.0.0", loc: "Denied" };
        try {
            const ipRes  = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipRes.json();
            info.ip = ipData.ip;

            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            info.loc = `${pos.coords.latitude},${pos.coords.longitude}`;
        } catch (e) {
            console.log("Device Info Error", e);
        }
        return info;
    }

    // ===================================================
    // العودة لشاشة الاختيار
    // ===================================================
    window.goBack = function() {
        const qrView  = els.qrView;
        const selView = els.selectionView;

        clearInterval(qrTimer);
        qrTimer = null;

        qrView.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            qrView.classList.add('hidden');
            qrView.style.animation = '';
            selView.classList.remove('hidden');
            selView.style.animation = 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both';
        }, 280);
    };

    // ===================================================
    // توليد QR
    // ===================================================
    function generateQR() {
        const container = els.qrContainer;
        container.innerHTML = '';

        qrInstance = new QRCode(container, {
            width:        256,
            height:       256,
            correctLevel: QRCode.CorrectLevel.H
        });

        updateQR();

        clearInterval(qrTimer);
        qrTimer = setInterval(updateQR, 30000);
    }

    function updateQR() {
        if (!qrInstance) return;

        const timestamp   = Date.now();
        const rawData     = `${deviceId}|${currentMode}|${timestamp}`;
        const encodedData = btoa(rawData);

        qrInstance.clear();
        qrInstance.makeCode(encodedData);

        // إعادة تشغيل شريط التقدم
        const fill = els.timerFill;
        if (fill) {
            fill.style.transition = 'none';
            fill.style.width      = '100%';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    fill.style.transition = 'width 30s linear';
                    fill.style.width      = '0%';
                });
            });
        }
    }

});
