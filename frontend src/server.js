const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend-src')));

// ==========================================
// IN-MEMORY DATABASE STORE (SQLite Fallback)
// ==========================================

let studentsDB = [
    { id: 101, regNo: 'SCH/2026/001', fullName: 'Mukasa Ronald', classId: 1, className: 'Senior 1 Blue' },
    { id: 102, regNo: 'SCH/2026/002', fullName: 'Nakalema Sarah', classId: 1, className: 'Senior 1 Blue' },
    { id: 103, regNo: 'SCH/2026/003', fullName: 'Okello David', classId: 3, className: 'P.7 Alpha' },
    { id: 104, regNo: 'SCH/2026/004', fullName: 'Achieng Brenda', classId: 2, className: 'Senior 2 Red' },
    { id: 105, regNo: 'SCH/2026/005', fullName: 'Kato Paul', classId: 1, className: 'Senior 1 Blue' }
];

let marksheetDB = {
    // "classId-subjectId-term": [ { studentId, formative, exam } ]
    "1-1-Term 1 2026": [
        { studentId: 101, formative: 16, exam: 68 },
        { studentId: 102, formative: 18, exam: 74 },
        { studentId: 105, formative: 10, exam: 38 }
    ]
};

let ledgerDB = [
    { studentId: 101, regNo: 'SCH/2026/001', fullName: 'Mukasa Ronald', classId: 1, className: 'Senior 1 Blue', totalFee: 650000, amountPaid: 450000, lastPaymentDate: '2026-02-10' },
    { studentId: 102, regNo: 'SCH/2026/002', fullName: 'Nakalema Sarah', classId: 1, className: 'Senior 1 Blue', totalFee: 650000, amountPaid: 650000, lastPaymentDate: '2026-02-01' },
    { studentId: 103, regNo: 'SCH/2026/003', fullName: 'Okello David', classId: 3, className: 'P.7 Alpha', totalFee: 450000, amountPaid: 150000, lastPaymentDate: '2026-01-28' },
    { studentId: 104, regNo: 'SCH/2026/004', fullName: 'Achieng Brenda', classId: 2, className: 'Senior 2 Red', totalFee: 650000, amountPaid: 0, lastPaymentDate: 'N/A' },
    { studentId: 105, regNo: 'SCH/2026/005', fullName: 'Kato Paul', classId: 1, className: 'Senior 1 Blue', totalFee: 650000, amountPaid: 200000, lastPaymentDate: '2026-02-14' }
];

let paymentLogs = [];

let systemLicenseDB = {
    active: true,
    schoolName: 'Acme Academy',
    licenseType: 'Enterprise School License',
    licenseKey: 'ACME-2026-TERM1-9872-410A',
    expiryDate: '2026-12-15',
    daysRemaining: 87,
    currentTerm: 'Term 1 2026'
};

// ==========================================
// NCDC CBC DESCRIPTOR HELPER
// ==========================================
function getCbcDescriptor(totalScore) {
    if (totalScore >= 80) return { code: '3', label: 'Outstanding' };
    if (totalScore >= 60) return { code: '2', label: 'Moderate' };
    return { code: '1', label: 'Basic' };
}

// ==========================================
// 1. MARKBOOK API ENDPOINTS
// ==========================================

// GET /api/marks?classId=1&subjectId=1&term=Term%201%202026
app.get('/api/marks', (req, res) => {
    const { classId, subjectId, term } = req.query;
    const markKey = `${classId}-${subjectId}-${term}`;

    // Get all students matching the class
    const classStudents = studentsDB.filter(s => s.classId == classId);
    const existingMarks = marksheetDB[markKey] || [];

    const mergedRows = classStudents.map(student => {
        const markRecord = existingMarks.find(m => m.studentId === student.id) || { formative: 0, exam: 0 };
        const total = Math.min(100, Math.max(0, (markRecord.formative || 0) + (markRecord.exam || 0)));
        const descriptor = getCbcDescriptor(total);

        return {
            studentId: student.id,
            regNo: student.regNo,
            studentName: student.fullName,
            formative: markRecord.formative,
            exam: markRecord.exam,
            total,
            descriptor
        };
    });

    res.json({ success: true, data: mergedRows });
});

// POST /api/marks/batch
app.post('/api/marks/batch', (req, res) => {
    const { classId, subjectId, term, marks } = req.body;

    if (!classId || !subjectId || !term || !Array.isArray(marks)) {
        return res.status(400).json({ success: false, message: 'Invalid payload parameters.' });
    }

    const markKey = `${classId}-${subjectId}-${term}`;
    marksheetDB[markKey] = marks.map(m => ({
        studentId: m.studentId,
        formative: parseFloat(m.formative) || 0,
        exam: parseFloat(m.exam) || 0
    }));

    res.json({
        success: true,
        message: `Successfully saved marks for ${marks.length} students.`,
        updatedCount: marks.length
    });
});
// GET /api/reports/student?studentId=101&term=Term%201%202026
app.get('/api/reports/student', (req, res) => {
    const { studentId, term } = req.query;

    const student = studentsDB.find(s => s.id == studentId);
    if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const report = {
        studentName: student.fullName,
        regNo: student.regNo,
        className: student.className,
        term: term || 'Term 1 2026',
        subjects: [
            { code: 'MTH', name: 'Mathematics', formative: 16, exam: 68, total: 84, descriptorCode: '3', descriptorLabel: 'Outstanding', teacherComment: 'Grasps numerical logic efficiently.' },
            { code: 'PHY', name: 'Physics', formative: 14, exam: 58, total: 72, descriptorCode: '2', descriptorLabel: 'Moderate', teacherComment: 'Shows steady progress in practical experiments.' },
            { code: 'ENG', name: 'English Language', formative: 18, exam: 70, total: 88, descriptorCode: '3', descriptorLabel: 'Outstanding', teacherComment: 'Excellent articulation and essay structuring.' },
            { code: 'BIO', name: 'Biology', formative: 12, exam: 45, total: 57, descriptorCode: '1', descriptorLabel: 'Basic', teacherComment: 'Needs to review core biological diagrams.' }
        ],
        headteacherComment: `${student.fullName} demonstrates great potential. With continued dedication in science subjects, outstanding performance is well within reach.`
    };

    res.json({ success: true, data: report });
});

// ==========================================
// 2. BURSARY & FEE LEDGER API ENDPOINTS
// ==========================================

// GET /api/bursary/ledger
app.get('/api/bursary/ledger', (req, res) => {
    const ledgerWithBalances = ledgerDB.map(item => ({
        id: item.studentId,
        regNo: item.regNo,
        fullName: item.fullName,
        classId: item.classId,
        className: item.className,
        totalFee: item.totalFee,
        amountPaid: item.amountPaid,
        balance: Math.max(0, item.totalFee - item.amountPaid),
        lastPaymentDate: item.lastPaymentDate
    }));

    res.json({ success: true, data: ledgerWithBalances });
});

// POST /api/bursary/pay
app.post('/api/bursary/pay', (req, res) => {
    const { studentId, amountPaid, receiptNo, paymentMethod, paymentDate } = req.body;

    const studentRecord = ledgerDB.find(s => s.studentId == studentId);
    if (!studentRecord) {
        return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const paymentAmount = parseFloat(amountPaid) || 0;
    if (paymentAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    }

    // Update Ledger Balance
    studentRecord.amountPaid += paymentAmount;
    studentRecord.lastPaymentDate = paymentDate ? paymentDate.split('T')[0] : new Date().toISOString().split('T')[0];

    // Log transaction entry
    const auditLog = {
        id: paymentLogs.length + 1,
        studentId,
        receiptNo,
        amountPaid: paymentAmount,
        paymentMethod: paymentMethod || 'Cash',
        paymentDate: studentRecord.lastPaymentDate,
        remainingBalance: Math.max(0, studentRecord.totalFee - studentRecord.amountPaid)
    };
    paymentLogs.push(auditLog);

    res.json({
        success: true,
        message: `Payment of ${paymentAmount} logged successfully.`,
        data: auditLog
    });
});

// ==========================================
// 3. SOFTWARE LICENSING API ENDPOINTS
// ==========================================

// GET /api/system/license
app.get('/api/system/license', (req, res) => {
    res.json({ success: true, data: systemLicenseDB });
});

// POST /api/system/license/activate
app.post('/api/system/license/activate', (req, res) => {
    const { licenseKey } = req.body;

    if (!licenseKey || licenseKey.trim().length < 8) {
        return res.status(400).json({ success: false, message: 'Invalid activation key format.' });
    }

    // Apply key update
    systemLicenseDB.active = true;
    systemLicenseDB.licenseKey = licenseKey.trim();
    systemLicenseDB.daysRemaining = 120; // Extends term license

    res.json({
        success: true,
        message: 'Software subscription license successfully activated.',
        data: systemLicenseDB
    });
});

// Wildcard Route for SPA Frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend-src', 'index.html'));
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`[School System Backend] Running on http://localhost:${PORT}`);
});