const express = require('express');
const cors = require('cors');
const path = require('path');
const Knex = require('knex');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend-src')));

// ==========================================
// SQLITE DATABASE SETUP VIA KNEX.JS
// ==========================================
const db = Knex({
    client: 'sqlite3',
    connection: {
        filename: path.join(__dirname, 'app.sqlite')
    },
    useNullAsDefault: true
});

// Initialize Database Schema & Seed Defaults
async function initDatabase() {
    // 1. Students Table
    const hasStudents = await db.schema.hasTable('students');
    if (!hasStudents) {
        await db.schema.createTable('students', (table) => {
            table.increments('id').primary();
            table.string('regNo').unique().notNullable();
            table.string('fullName').notNullable();
            table.integer('classId').notNullable();
            table.string('className').notNullable();
        });

        // Seed initial students
        await db('students').insert([
            { id: 101, regNo: 'SCH/2026/001', fullName: 'Mukasa Ronald', classId: 1, className: 'Senior 1 Blue' },
            { id: 102, regNo: 'SCH/2026/002', fullName: 'Nakalema Sarah', classId: 1, className: 'Senior 1 Blue' },
            { id: 103, regNo: 'SCH/2026/003', fullName: 'Okello David', classId: 3, className: 'P.7 Alpha' },
            { id: 104, regNo: 'SCH/2026/004', fullName: 'Achieng Brenda', classId: 2, className: 'Senior 2 Red' },
            { id: 105, regNo: 'SCH/2026/005', fullName: 'Kato Paul', classId: 1, className: 'Senior 1 Blue' }
        ]);
    }

    // 2. Marksheet Table
    const hasMarks = await db.schema.hasTable('marks');
    if (!hasMarks) {
        await db.schema.createTable('marks', (table) => {
            table.increments('id').primary();
            table.integer('studentId').notNullable();
            table.integer('classId').notNullable();
            table.integer('subjectId').notNullable();
            table.string('term').notNullable();
            table.float('formative').defaultTo(0);
            table.float('exam').defaultTo(0);
            table.unique(['studentId', 'classId', 'subjectId', 'term']);
        });

        await db('marks').insert([
            { studentId: 101, classId: 1, subjectId: 1, term: 'Term 1 2026', formative: 16, exam: 68 },
            { studentId: 102, classId: 1, subjectId: 1, term: 'Term 1 2026', formative: 18, exam: 74 },
            { studentId: 105, classId: 1, subjectId: 1, term: 'Term 1 2026', formative: 10, exam: 38 }
        ]);
    }

    // 3. Fee Ledger Table
    const hasLedger = await db.schema.hasTable('ledger');
    if (!hasLedger) {
        await db.schema.createTable('ledger', (table) => {
            table.integer('studentId').primary();
            table.float('totalFee').notNullable();
            table.float('amountPaid').defaultTo(0);
            table.string('lastPaymentDate');
        });

        await db('ledger').insert([
            { studentId: 101, totalFee: 650000, amountPaid: 450000, lastPaymentDate: '2026-02-10' },
            { studentId: 102, totalFee: 650000, amountPaid: 650000, lastPaymentDate: '2026-02-01' },
            { studentId: 103, totalFee: 450000, amountPaid: 150000, lastPaymentDate: '2026-01-28' },
            { studentId: 104, totalFee: 650000, amountPaid: 0, lastPaymentDate: 'N/A' },
            { studentId: 105, totalFee: 650000, amountPaid: 200000, lastPaymentDate: '2026-02-14' }
        ]);
    }

    // 4. Payment Audit Logs Table
    const hasPaymentLogs = await db.schema.hasTable('payment_logs');
    if (!hasPaymentLogs) {
        await db.schema.createTable('payment_logs', (table) => {
            table.increments('id').primary();
            table.integer('studentId').notNullable();
            table.string('receiptNo').notNullable();
            table.float('amountPaid').notNullable();
            table.string('paymentMethod').notNullable();
            table.string('paymentDate').notNullable();
            table.float('remainingBalance').notNullable();
        });
    }

    // 5. System Licensing Table
    const hasLicense = await db.schema.hasTable('system_license');
    if (!hasLicense) {
        await db.schema.createTable('system_license', (table) => {
            table.integer('id').primary().defaultTo(1);
            table.boolean('active').defaultTo(true);
            table.string('schoolName');
            table.string('licenseType');
            table.string('licenseKey');
            table.string('expiryDate');
            table.integer('daysRemaining');
            table.string('currentTerm');
        });

        await db('system_license').insert({
            id: 1,
            active: true,
            schoolName: 'Acme Academy',
            licenseType: 'Enterprise School License',
            licenseKey: 'ACME-2026-TERM1-9872-410A',
            expiryDate: '2026-12-15',
            daysRemaining: 87,
            currentTerm: 'Term 1 2026'
        });
    }

    console.log('[Database] SQLite persistent store ready (app.sqlite).');
}

initDatabase();

// Helper: NCDC CBC Descriptor
function getCbcDescriptor(totalScore) {
    if (totalScore >= 80) return { code: '3', label: 'Outstanding' };
    if (totalScore >= 60) return { code: '2', label: 'Moderate' };
    return { code: '1', label: 'Basic' };
}

// ==========================================
// 1. MARKBOOK API ENDPOINTS
// ==========================================

app.get('/api/marks', async (req, res) => {
    try {
        const { classId, subjectId, term } = req.query;

        const students = await db('students').where({ classId });
        const existingMarks = await db('marks').where({ classId, subjectId, term });

        const mergedRows = students.map(student => {
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
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/marks/batch', async (req, res) => {
    try {
        const { classId, subjectId, term, marks } = req.body;

        if (!classId || !subjectId || !term || !Array.isArray(marks)) {
            return res.status(400).json({ success: false, message: 'Invalid payload parameters.' });
        }

        for (const m of marks) {
            const formative = parseFloat(m.formative) || 0;
            const exam = parseFloat(m.exam) || 0;

            const existing = await db('marks')
                .where({ studentId: m.studentId, classId, subjectId, term })
                .first();

            if (existing) {
                await db('marks')
                    .where({ id: existing.id })
                    .update({ formative, exam });
            } else {
                await db('marks').insert({
                    studentId: m.studentId,
                    classId,
                    subjectId,
                    term,
                    formative,
                    exam
                });
            }
        }

        res.json({ success: true, message: `Saved marks for ${marks.length} students to database.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 2. BURSARY & FEE LEDGER API ENDPOINTS
// ==========================================

app.get('/api/bursary/ledger', async (req, res) => {
    try {
        const rows = await db('students')
            .join('ledger', 'students.id', '=', 'ledger.studentId')
            .select(
                'students.id',
                'students.regNo',
                'students.fullName',
                'students.classId',
                'students.className',
                'ledger.totalFee',
                'ledger.amountPaid',
                'ledger.lastPaymentDate'
            );

        const data = rows.map(r => ({
            id: r.id,
            regNo: r.regNo,
            fullName: r.fullName,
            classId: r.classId,
            className: r.className,
            totalFee: r.totalFee,
            amountPaid: r.amountPaid,
            balance: Math.max(0, r.totalFee - r.amountPaid),
            lastPaymentDate: r.lastPaymentDate
        }));

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/bursary/pay', async (req, res) => {
    try {
        const { studentId, amountPaid, receiptNo, paymentMethod, paymentDate } = req.body;

        const ledgerRecord = await db('ledger').where({ studentId }).first();
        if (!ledgerRecord) {
            return res.status(404).json({ success: false, message: 'Student record not found.' });
        }

        const paymentAmount = parseFloat(amountPaid) || 0;
        if (paymentAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
        }

        const newAmountPaid = ledgerRecord.amountPaid + paymentAmount;
        const formattedDate = paymentDate ? paymentDate.split('T')[0] : new Date().toISOString().split('T')[0];
        const remainingBalance = Math.max(0, ledgerRecord.totalFee - newAmountPaid);

        // Transaction updates
        await db('ledger').where({ studentId }).update({
            amountPaid: newAmountPaid,
            lastPaymentDate: formattedDate
        });

        await db('payment_logs').insert({
            studentId,
            receiptNo,
            amountPaid: paymentAmount,
            paymentMethod: paymentMethod || 'Cash',
            paymentDate: formattedDate,
            remainingBalance
        });

        res.json({
            success: true,
            message: `Payment of ${paymentAmount} logged successfully.`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 3. REPORTS API ENDPOINT
// ==========================================

app.get('/api/reports/student', async (req, res) => {
    try {
        const { studentId, term } = req.query;

        const student = await db('students').where({ id: studentId }).first();
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
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 4. LICENSING API ENDPOINTS
// ==========================================

app.get('/api/system/license', async (req, res) => {
    try {
        const license = await db('system_license').where({ id: 1 }).first();
        res.json({ success: true, data: license });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/system/license/activate', async (req, res) => {
    try {
        const { licenseKey } = req.body;

        if (!licenseKey || licenseKey.trim().length < 8) {
            return res.status(400).json({ success: false, message: 'Invalid activation key format.' });
        }

        await db('system_license').where({ id: 1 }).update({
            active: true,
            licenseKey: licenseKey.trim(),
            daysRemaining: 120
        });

        const updatedLicense = await db('system_license').where({ id: 1 }).first();

        res.json({
            success: true,
            message: 'Software subscription license successfully activated.',
            data: updatedLicense
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Wildcard SPA Route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend-src', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[School System Backend] Running on http://localhost:${PORT}`);
});
