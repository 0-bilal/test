document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOcrP9pM8GwyX7clkYfK0C3x5GmbXfDnpwYaziSWgdxWauNII9tJ0yHJnMme9ljEEd/exec';

    // ✅ إرسال اسم الفرع بالعربي مباشرةً لتفادي مشكلة الترجمة في السيرفر
    const branchEmployees = {
        "المزاحمية": [
            { ar: "رمان",  en: "Rumaan"  },
            { ar: "محمد",  en: "Mohamed" }
        ],
        "الدوادمي": [
            { ar: "شاهين", en: "Shahin"  },
            { ar: "دورجا", en: "Dwrja"   },
            { ar: "نسيم",  en: "Nasim"   },
            { ar: "بلال",  en: "Bilal"   }
        ]
    };

    // قاموس عرض الفروع (القيمة لزر الراديو → الاسم العربي)
    const BRANCH_DISPLAY = {
        "Muzahmiyah": "المزاحمية",
        "Dawadimi":   "الدوادمي"
    };

    let selectedEmployee    = localStorage.getItem('qb_staff_name')   || "";
    let selectedBranchAr    = localStorage.getItem('qb_staff_branch') || ""; // الآن يُخزَّن بالعربي
    let html5QrCode         = null;
    let employeeReady       = false;

    const els = {
        branchCard:        document.getElementById('branchCard'),
        employeeCard:      document.getElementById('employeeCard'),
        empGrid:           document.getElementById('employeeGrid'),
        scannerCard:       document.getElementById('scannerCard'),
        scannerIdle:       document.getElementById('scannerIdle'),
        scannerPermission: document.getElementById('scannerPermission'),
        scannerSection:    document.getElementById('scannerSection'),
        savedInfo:         document.getElementById('savedInfo'),
        displayUser:       document.getElementById('displayUser'),
        displayBranch:     document.getElementById('displayBranch'),
        resetBtn:          document.getElementById('resetBtn'),
        retryCamera:       document.getElementById('retryCamera'),
        modal:             document.getElementById('customModal'),
        modalTitle:        document.getElementById('modalTitle'),
        modalMsg:          document.getElementById('modalMessage'),
        modalClose:        document.getElementById('modalClose'),
        modalLoader:       document.getElementById('modalLoader'),
        modalIcon:         document.getElementById('modalIcon'),
        resetModal:        document.getElementById('resetModal'),
        resetCodeInput:    document.getElementById('resetCodeInput'),
        confirmReset:      document.getElementById('confirmReset'),
        cancelReset:       document.getElementById('cancelReset'),
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
        if (selectedEmployee && selectedBranchAr) {
            els.branchCard.classList.add('hidden');
            els.employeeCard.classList.add('hidden');
            els.savedInfo.classList.remove('hidden');

            els.displayUser.innerText   = selectedEmployee;
            els.displayBranch.innerText = selectedBranchAr; // يُعرض مباشرةً بالعربي

            employeeReady = true;
            startScanner();
        } else {
            showScannerIdle();
        }
    };

    // ===================================================
    // اختيار الفرع
    // ===================================================
    document.querySelectorAll('input[name="branch"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const branchEn = e.target.value; // قيمة الراديو: Muzahmiyah أو Dawadimi
            selectedBranchAr = BRANCH_DISPLAY[branchEn] || branchEn; // ✅ نحوّله للعربي فوراً

            // بناء شبكة الموظفين
            els.empGrid.innerHTML = "";
            els.empGrid.classList.remove('employee-placeholder-grid');
            els.empGrid.classList.add('active-grid');

            branchEmployees[selectedBranchAr].forEach(emp => {
                const btn = document.createElement('button');
                btn.type      = 'button';
                btn.className = 'emp-btn';
                btn.innerHTML = `<i data-lucide="user"></i>${emp.ar} | ${emp.en}`;
                btn.onclick   = () => selectEmployee(emp.ar, btn);
                els.empGrid.appendChild(btn);
            });

            lucide.createIcons();

            employeeReady    = false;
            selectedEmployee = "";

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

        if (html5QrCode && html5QrCode.getState() > 1) {
            html5QrCode.stop()
                .then(initCamera)
                .catch(() => initCamera());
        } else {
            initCamera();
        }
    }

    function initCamera() {
        if (html5QrCode && html5QrCode.getState() === 2) return;

        showScannerActive();

        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("reader");
        }

        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            (decodedText) => {
                if (html5QrCode.getState() > 1) {
                    html5QrCode.stop().catch(() => {});
                }
                sendAttendance(decodedText);
            }
        ).catch(() => {
            showScannerPermission();
        });
    }

    if (els.retryCamera) {
        els.retryCamera.onclick = () => {
            if (employeeReady) initCamera();
            else showScannerIdle();
        };
    }

    // ===================================================
    // إرسال الحضور
    // ===================================================
    async function sendAttendance(qrData) {
        showModal('loading', 'جاري التحقق...', 'يتم تسجيل حضورك وضبط البيانات...');

        let userIP = "Unknown";
        try {
            const res  = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            userIP = data.ip;
        } catch (e) {
            console.error("Could not fetch IP", e);
        }

        const payload = {
            action:       'ATTENDANCE',
            employeeName: selectedEmployee,
            branch:       selectedBranchAr,   // ✅ يُرسَل بالعربي مباشرةً
            qrPayload:    qrData,
            ip:           userIP,
            fingerprint:  getFingerprint()
        };

        fetch(SCRIPT_URL, {
            method:  'POST',
            mode:    'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body:    JSON.stringify(payload)
        }).then(() => {
            localStorage.setItem('qb_staff_name',   selectedEmployee);
            localStorage.setItem('qb_staff_branch', selectedBranchAr); // ✅ حفظ بالعربي
            showModal('success', 'تم التسجيل', `شكراً ${selectedEmployee}، تم تسجيل حضورك بنجاح.`);
            setTimeout(() => location.reload(), 3000);
        }).catch(() => {
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

            // تعطيل الزر لمنع الضغط المزدوج
            els.confirmReset.disabled = true;

            fetch(SCRIPT_URL, {
                method:  'POST',
                mode:    'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body:    JSON.stringify({ action: 'VERIFY_RESET', code: code })
            }).then(() => {
                // ✅ بما أن no-cors لا يُعيد استجابة، نثق بالسيرفر ونمسح محلياً
                // السيرفر يُغير الكود فور الاستلام (قبل الرد)
                localStorage.removeItem('qb_staff_name');
                localStorage.removeItem('qb_staff_branch');
                location.reload();
            }).catch(() => {
                els.confirmReset.disabled = false;
                alert('تعذر الاتصال بالسيرفر. يُرجى المحاولة مرة أخرى.');
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
