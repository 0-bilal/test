document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby55crES3Cgs2TZClHEsUUG0q8esj_1LZmQW5lYQQxFWIly5QAoBBuoUNGPUI4w-Bwe/exec';

    const branchEmployees = {
    "Muzahmiyah": [
        { ar: "رمان", en: "Rumaan" },
        { ar: "محمد", en: "Mohamed" }
    ],
    "Dawadimi": [
        { ar: "شاهين", en: "Shahin" },
        { ar: "دورجا", en: "Dwrja" },
        { ar: "نسيم", en: "Nasim" },
        { ar: "بلال", en: "Bilal" }
    ]
};

    let selectedEmployee = localStorage.getItem('qb_staff_name')   || "";
    let selectedBranch   = localStorage.getItem('qb_staff_branch') || "";
    let html5QrCode = null;
    let scannerRunning = false;
    let employeeReady = false;

    const els = {
        branchCard:         document.getElementById('branchCard'),
        employeeCard:       document.getElementById('employeeCard'),
        empGrid:            document.getElementById('employeeGrid'),
        scannerCard:        document.getElementById('scannerCard'),
        scannerIdle:        document.getElementById('scannerIdle'),
        scannerPermission:  document.getElementById('scannerPermission'),
        scannerSection:     document.getElementById('scannerSection'),
        savedInfo:          document.getElementById('savedInfo'),
        displayUser:        document.getElementById('displayUser'),
        displayBranch:      document.getElementById('displayBranch'),
        resetBtn:           document.getElementById('resetBtn'),
        retryCamera:        document.getElementById('retryCamera'),
        modal:              document.getElementById('customModal'),
        modalTitle:         document.getElementById('modalTitle'),
        modalMsg:           document.getElementById('modalMessage'),
        modalClose:         document.getElementById('modalClose'),
        modalLoader:        document.getElementById('modalLoader'),
        modalIcon:          document.getElementById('modalIcon'),
        resetModal:         document.getElementById('resetModal'),
        resetCodeInput:     document.getElementById('resetCodeInput'),
        confirmReset:       document.getElementById('confirmReset'),
        cancelReset:        document.getElementById('cancelReset'),
    };

    // ===================================================
    // إدارة حالات الماسح
    // ===================================================
    function showScannerIdle() {
        els.scannerIdle.classList.remove('hidden');
        els.scannerPermission.classList.add('hidden');
        els.scannerSection.classList.add('hidden');
    }

    function showScannerPermission() {
        els.scannerIdle.classList.add('hidden');
        els.scannerPermission.classList.remove('hidden');
        els.scannerSection.classList.add('hidden');
    }

    function showScannerActive() {
        els.scannerIdle.classList.add('hidden');
        els.scannerPermission.classList.add('hidden');
        els.scannerSection.classList.remove('hidden');
    }

    // ===================================================
    // التحقق من الجلسة المحفوظة
    // ===================================================
    const checkSavedSession = () => {
        if (selectedEmployee && selectedBranch) {
            // إخفاء بطاقة الفرع والموظف، إظهار الجلسة المحفوظة
            els.branchCard.classList.add('hidden');
            els.employeeCard.classList.add('hidden');
            els.savedInfo.classList.remove('hidden');

            els.displayUser.innerText   = selectedEmployee;
            els.displayBranch.innerText = selectedBranch === "Dawadimi" ? "الدوادمي" : "المزاحمية";

            employeeReady = true;
            startScanner();
        } else {
            // الحالة الافتراضية: الماسح في وضع الانتظار
            showScannerIdle();
        }
    };

    // ===================================================
    // اختيار الفرع
    // ===================================================
    document.querySelectorAll('input[name="branch"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        selectedBranch = e.target.value;

        // بناء شبكة الموظفين
        els.empGrid.innerHTML = "";
        els.empGrid.classList.remove('employee-placeholder-grid');
        els.empGrid.classList.add('active-grid');

        // ابحث عن هذا الجزء داخل document.querySelectorAll('input[name="branch"]')
branchEmployees[selectedBranch].forEach(emp => {
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'emp-btn';
    
    // هنا ندمج الاسم العربي والإنجليزي
    // النتيجة ستكون مثلاً: رمان | Rumaan
    const displayName = `${emp.ar} | ${emp.en}`;
    
    btn.innerHTML = `<i data-lucide="user"></i>${displayName}`;
    
    // عند الضغط، نرسل الاسم العربي (أو الإنجليزي حسب رغبتك في التخزين)
    btn.onclick   = () => selectEmployee(emp.ar, btn); 
    
    els.empGrid.appendChild(btn);
});

        lucide.createIcons();

        // تصفير حالة الموظف
        employeeReady = false;
        selectedEmployee = "";

        // التعديل هنا: إيقاف الماسح فقط إذا كان يعمل بالفعل لتجنب الخطأ
        if (html5QrCode && html5QrCode.getState() > 1) {
            html5QrCode.stop().catch(() => {});
        }
        
        showScannerIdle();
    });
});

    // ===================================================
    // اختيار الموظف
    // ===================================================
    function selectEmployee(name, btnElement) {
        selectedEmployee = name;
        document.querySelectorAll('.emp-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
        employeeReady = true;
        startScanner();
    }

    // ===================================================
    // تشغيل الماسح
    // ===================================================
    function startScanner() {
    if (!employeeReady) {
        showScannerIdle();
        return;
    }

    // التحقق مما إذا كان الكائن موجوداً والماسح في حالة تشغيل أو انتظار (حالة 2 أو 3)
    if (html5QrCode && html5QrCode.getState() > 1) {
        html5QrCode.stop()
            .then(() => {
                initCamera();
            })
            .catch(err => {
                console.warn("فشل الإيقاف، سيتم البدء من جديد:", err);
                initCamera();
            });
    } else {
        initCamera();
    }
}

    function initCamera() {
    // إذا كانت الكاميرا تعمل بالفعل، لا تفعل شيئاً
    if (html5QrCode && html5QrCode.getState() === 2) return;

    showScannerActive();
    
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            // التحقق من الحالة قبل الإيقاف عند النجاح
            if (html5QrCode.getState() > 1) {
                html5QrCode.stop().catch(() => {});
            }
            sendAttendance(decodedText);
        }
    ).catch(() => {
        showScannerPermission();
    });
}

    // زر إعادة المحاولة لإذن الكاميرا
    if (els.retryCamera) {
        els.retryCamera.onclick = () => {
            if (employeeReady) {
                initCamera();
            } else {
                showScannerIdle();
            }
        };
    }

    // ===================================================
    // إرسال الحضور
    // ===================================================
    async function sendAttendance(qrData) {
    showModal('loading', 'جاري التحقق...', 'يتم تسجيل حضورك وضبط البيانات...');

    let userIP = "Unknown";
    try {
        // جلب الـ IP العام لجهاز الموظف
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        userIP = data.ip;
    } catch (e) {
        console.error("Could not fetch IP", e);
    }

    const payload = {
        action:       'ATTENDANCE',
        employeeName: selectedEmployee,
        branch:       selectedBranch,
        qrPayload:    qrData,
        ip:           userIP, // إرسال الـ IP إلى السيرفر
        fingerprint:  getFingerprint()
    };

    fetch(SCRIPT_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(payload)
    }).then(() => {
        localStorage.setItem('qb_staff_name',   selectedEmployee);
        localStorage.setItem('qb_staff_branch', selectedBranch);
        showModal('success', 'تم التسجيل', `شكراً ${selectedEmployee}، تم تسجيل حضورك بنجاح.`);
        setTimeout(() => location.reload(), 3000);
    }).catch(err => {
        showModal('error', 'خطأ في الاتصال', 'تعذر إرسال البيانات، يرجى المحاولة مرة أخرى.');
    });
}

    // ===================================================
    // إعادة التعيين
    // ===================================================
    if (els.resetBtn) {
        els.resetBtn.onclick = () => {
            els.resetModal.classList.remove('hidden');
            els.resetCodeInput.value = "";
            els.resetCodeInput.focus();
            lucide.createIcons();
        };
    }

    if (els.cancelReset) {
        els.cancelReset.onclick = () => els.resetModal.classList.add('hidden');
    }

    if (els.confirmReset) {
        els.confirmReset.onclick = () => {
            const code = els.resetCodeInput.value.trim();
            if (!code) return;

            els.resetModal.classList.add('hidden');
            showModal('loading', 'جاري التحقق...', 'يتم التحقق من كود إعادة التعيين');

            fetch(SCRIPT_URL, {
                method: 'POST',
                mode:   'no-cors',
                body:   JSON.stringify({ action: 'VERIFY_RESET', code })
            }).then(() => {
                localStorage.removeItem('qb_staff_name');
                localStorage.removeItem('qb_staff_branch');
                showModal('success', 'تمت إعادة التعيين', 'سيتم تحديث الصفحة الآن...');
                setTimeout(() => location.reload(), 2000);
            }).catch(() => {
                showModal('error', 'خطأ', 'تعذر التحقق من الكود.');
            });
        };
    }

    // ===================================================
    // Modal
    // ===================================================
    function showModal(type, title, msg) {
        els.modal.classList.remove('hidden');
        els.modalTitle.innerText = title;
        els.modalMsg.innerText   = msg;
        els.modalLoader.classList.toggle('hidden', type !== 'loading');
        els.modalClose.classList.toggle('hidden', type === 'loading');

        if (type !== 'loading') {
            const icon = type === 'success' ? 'check-circle' : 'alert-circle';
            els.modalIcon.innerHTML = `<i data-lucide="${icon}" class="${type}-icon"></i>`;
            lucide.createIcons();
        } else {
            els.modalIcon.innerHTML = '';
        }
    }

    els.modalClose.onclick = () => els.modal.classList.add('hidden');

    // ===================================================
    // Fingerprint
    // ===================================================
    const getFingerprint = () =>
        btoa(`${navigator.userAgent}|${window.screen.width}x${window.screen.height}`);

    // ===================================================
    // التهيئة
    // ===================================================
    checkSavedSession();
});