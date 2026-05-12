const APP_VERSIONS = {
    "ECL": "v1.3.9",
    "FIL": "v1.3.10",
    "CPV": "v1.3.3",
    "ATT": "v1.1.0",
    "EDR": "BETA",
    "PRR": "BETA",
    "PAL": "BETA",
    "GLOBAL": "v1.13.13" 
    //  2026/05/10 date
};

// دالة لتحديث الإصدارات في الصفحة تلقائياً
function updateDisplayedVersions() {
    // تحديث الإصدار في الفوتر (لجميع الملفات)
    const versionElement = document.querySelector('.version-number');
    if (versionElement) {
        // إذا كنا في صفحة معينة، نأخذ إصدارها، وإلا نضع الإصدار العام
        const path = window.location.pathname;
        if (path.includes('ECL')) versionElement.innerText = APP_VERSIONS.ECL;
        else if (path.includes('FIL')) versionElement.innerText = APP_VERSIONS.FIL;
        else if (path.includes('CPV')) versionElement.innerText = APP_VERSIONS.CPV;
        else if (path.includes('ATT')) versionElement.innerText = APP_VERSIONS.ATT;
        else if (path.includes('EDR')) versionElement.innerText = APP_VERSIONS.EDR;
        else if (path.includes('PRR')) versionElement.innerText = APP_VERSIONS.PRR;
        else if (path.includes('PAL')) versionElement.innerText = APP_VERSIONS.PAL;
        else versionElement.innerText = APP_VERSIONS.GLOBAL;
    }


    // تحديث البطاقات في الصفحة الرئيسية (index.html)
    const reportTags = document.querySelectorAll('.report-card');
    reportTags.forEach(card => {
        const href = card.getAttribute('href');
        const tag = card.querySelector('.report-tag:last-child');
        if (tag) {
            if (href.includes('ECL')) tag.innerText = APP_VERSIONS.ECL;
            if (href.includes('FIL')) tag.innerText = APP_VERSIONS.FIL;
            if (href.includes('EDR')) tag.innerText = APP_VERSIONS.EDR;
            if (href.includes('ATT')) tag.innerText = APP_VERSIONS.ATT;
            if (href.includes('PRR')) tag.innerText = APP_VERSIONS.PRR;
            if (href.includes('CPV')) tag.innerText = APP_VERSIONS.CPV;
            if (href.includes('PAL')) tag.innerText = APP_VERSIONS.PAL;
        }
    });
}

// تشغيل الدالة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', updateDisplayedVersions);