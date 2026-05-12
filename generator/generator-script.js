document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwAtnvWk0nAE22e_uaDiKZ0g4gtqQSRPGnFy0tDmcJBMWldUMOgvZXuavpuororwtoI/exec';

    let currentMode = 'IN';
    let deviceId   = localStorage.getItem('QB_DEVICE_ID');
    let branchName = localStorage.getItem('QB_BRANCH_NAME');
    let qrTimer    = null;
    let qrInstance = null;

    const els = {
        setupScreen:  document.getElementById('setupScreen'),
        deviceInput:  document.getElementById('deviceIdInput'),
        saveSetupBtn: document.getElementById('saveSetupBtn'),
        deviceDisplay:document.getElementById('deviceDisplay'),
        timestamp:    document.getElementById('timestamp'),
        selectionView:document.getElementById('selectionView'),
        qrView:       document.getElementById('qrView'),
        qrContainer:  document.getElementById('qrContainer'),
        qrModeBadge:  document.getElementById('qrModeBadge'),
        qrModeIcon:   document.getElementById('qrModeIcon'),
        qrModeLabel:  document.getElementById('qrModeLabel'),
        qrModeSub:    document.getElementById('qrModeSub'),
        timerFill:    document.getElementById('timerFill'),
        qrCard:       document.getElementById('qrView')?.querySelector('.qr-card'),
    };

    // --- التحقق من الجلسة ---
    if (!deviceId || !branchName) {
        els.setupScreen.classList.remove('hidden');
    } else {
        initMainSystem();
    }

    // --- حفظ إعداد الجهاز ---
    els.saveSetupBtn.onclick = async () => {
    const input = els.deviceInput.value.trim();
    if (!input) return;

    const device = await getDeviceInfo(); 

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // إضافة هذا السطر لتجاوز CORS
        headers: { 'Content-Type': 'text/plain' }, // تغيير النوع
        body: JSON.stringify({
            action:    'REGISTER_DEVICE',
            deviceId:  input,
            ip:        device.ip,
            location:  device.loc,
            userAgent: navigator.userAgent,
            screenRes: `${window.screen.width}x${window.screen.height}`
        })
    }).then(() => {
        // بما أن mode: 'no-cors' لا يعيد استجابة مقروءة، سنفترض النجاح مؤقتاً أو نستخدم وسيلة أخرى للتحقق
        localStorage.setItem('QB_DEVICE_ID', input);
        // ملاحظة: ستحتاج لتحديث الصفحة يدوياً أو انتظار الرد بطريقة مغايرة
        location.reload();
    });
};

    // --- تشغيل النظام الرئيسي ---
    function initMainSystem() {
        els.deviceDisplay.innerText = `فرع: ${branchName}`;
        setInterval(updateTime, 1000);
        updateTime();
    }

    // --- الساعة ---
    function updateTime() {
        const now = new Date();
        els.timestamp.innerText = now.toLocaleTimeString('en-GB', { hour12: false });
    }

    // --- تفعيل الوضع (حضور / انصراف) مع انتقال سلس ---
    window.activateMode = function(mode) {
        currentMode = mode;

        const selView = els.selectionView;
        const qrView  = els.qrView;
        const qrCard  = qrView.querySelector('.qr-card');
        const scanLine = qrView.querySelector('.qr-scan-line');
        const timerFill = els.timerFill;

        // تحديث واجهة QR View حسب الوضع
        const isIn = (mode === 'IN');

        // Badge
        els.qrModeBadge.className = 'qr-mode-badge ' + (isIn ? 'in-mode' : 'out-mode');
        els.qrModeIcon.setAttribute('data-lucide', isIn ? 'log-in' : 'log-out');
        els.qrModeLabel.innerText = isIn ? 'تسجيل حضور' : 'تسجيل انصراف';
        els.qrModeSub.innerText   = isIn ? 'Check-In'    : 'Check-Out';

        // QR Card اللون
        if (qrCard) {
            qrCard.className = 'qr-card ' + (isIn ? 'in-mode' : 'out-mode');
        }

        // Timer color
        if (timerFill) {
            timerFill.classList.toggle('in-mode', isIn);
        }

        lucide.createIcons();

        // انتقال: إخفاء البطاقتين
        selView.style.animation = 'fadeSlideDown 0.3s ease forwards';

        setTimeout(() => {
            selView.classList.add('hidden');
            selView.style.animation = '';

            // إنشاء QR
            generateQR();

            // إظهار QR View
            qrView.classList.remove('hidden');
            qrView.style.animation = 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both';

        }, 280);
    };

    async function getDeviceInfo() {
    let info = { ip: "0.0.0.0", loc: "Denied" };
    try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        info.ip = ipData.ip;
        
        const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        info.loc = `${pos.coords.latitude},${pos.coords.longitude}`;
    } catch (e) { console.log("Device Info Error", e); }
    return info;
}

    // --- العودة للاختيار ---
    window.goBack = function() {
        const qrView  = els.qrView;
        const selView = els.selectionView;

        // إيقاف مؤقت QR
        clearInterval(qrTimer);
        qrTimer = null;

        // انتقال: إخفاء QR View
        qrView.style.animation = 'slideOut 0.3s ease forwards';

        setTimeout(() => {
            qrView.classList.add('hidden');
            qrView.style.animation = '';

            // إظهار البطاقتين
            selView.classList.remove('hidden');
            selView.style.animation = 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both';

        }, 280);
    };

    // --- توليد QR ---
    function generateQR() {
        const container = els.qrContainer;
        container.innerHTML = '';

        qrInstance = new QRCode(container, {
            width:        256,
            height:       256,
            correctLevel: QRCode.CorrectLevel.H
        });

        updateQR();

        // تحديث كل 30 ثانية
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