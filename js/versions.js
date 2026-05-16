const APP_VERSIONS = {
    "ECL": "v1.5.0", // سجل تنظيف المعدات
    "FIL": "v1.4.1", // قائمة فحص جودة الفاكهة
    "CPV": "v1.3.4", // سند صرف نقدية
    "ATT": "v1.2.0", // حضور وانصراف الموظفين
    "EDR": "BETA", // تقرير نهاية اليوم
    "PRR": "DEV", // طلب استرجاع منتجات
    "PAL": "BETA", // متابعة توفر المنتجات
    "XPR": "BETA", // تقرير صلاحية المنتجات
    "REM": "v1.1.2 NEW", // تذكير تجديد الإقامات والعقود
    "RMM": "DEV", // سجل التصنيع اليومي
    "RSL": "DEV", // سجل معايير المكونات
    "GLOBAL": "v1.14.4" // 
    // سيظهر وسم بيتا // BETA
    // سيظهر وسم تطوير // DEV
    // سيظهر وسم جديد // NEW
};

function updateDisplayedVersions() {
    // 1. تحديث رقم الإصدار في الفوتر (لجميع صفحات النظام)
    const versionElement = document.querySelector('.version-number');
    if (versionElement) {
        const path = window.location.pathname.toUpperCase();
        // البحث عن الكود الذي يطابق اسم الصفحة الحالية
        const currentKey = Object.keys(APP_VERSIONS).find(key => path.includes(key));
        
        if (currentKey) {
            versionElement.innerText = APP_VERSIONS[currentKey];
        } else {
            versionElement.innerText = APP_VERSIONS.GLOBAL;
        }
    }

    // 2. تحديث البطاقات في الصفحة الرئيسية (index.html)
    const cards = document.querySelectorAll('.report-card');
    cards.forEach(card => {
        const href = card.getAttribute('href').toUpperCase();
        const body = card.querySelector('.report-card-body');
        
        // العثور على المفتاح المناسب (مثل ECL, XPR, PRL) بناءً على الرابط
        const key = Object.keys(APP_VERSIONS).find(k => href.includes(k));
        
        if (key && body) {
            const value = APP_VERSIONS[key];
            
            // إنشاء أو تنظيف حاوية الوسوم (tags-wrapper)
            let wrapper = body.querySelector('.tags-wrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.className = 'tags-wrapper';
                body.appendChild(wrapper);
            }
            wrapper.innerHTML = ''; // مسح المحتوى القديم لتجنب التكرار

            // المربع الأول: كود التقرير (الاختصار) دائماً في مربع أحمر
            wrapper.innerHTML += `<span class="report-tag">${key}</span>`;

            // المربع الثاني والثالث: تحليل القيمة المكتوبة في APP_VERSIONS
            if (value === "DEV") {
                wrapper.innerHTML += `<span class="tag-dev">قيد التطوير - DEV</span>`;
            } 
            else {
                // تقسيم القيمة إذا كانت تحتوي على مسافات (مثل "v1.0.5 BETA")
                const parts = value.split(" ");
                parts.forEach(part => {
                    if (part === "BETA") {
                        wrapper.innerHTML += `<span class="tag-beta">تجريبي - BETA</span>`;
                    } else if (part === "NEW") {
                        wrapper.innerHTML += `<span class="tag-new">جديد - NEW</span>`;
                    } else {
                        // إذا كان جزءاً من رقم الإصدار، يوضع في مربع أحمر منفصل
                        wrapper.innerHTML += `<span class="report-tag">${part}</span>`;
                    }
                });
            }
        }
    });
}

// تشغيل الدالة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', updateDisplayedVersions);