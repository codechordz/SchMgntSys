const express = require('express');
const cors = require('cors');
const path = require('path');
const Knex = require('knex');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FRONTEND_DIR = __dirname;
const DATABASE_FILE = path.join(__dirname, 'app.sqlite');
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));
app.use(express.json({ limit: '100kb' }));
app.use(express.static(FRONTEND_DIR));

const db = Knex({
    client: 'sqlite3',
    connection: { filename: DATABASE_FILE },
    useNullAsDefault: true,
    pool: {
        afterCreate(connection, done) {
            connection.run('PRAGMA foreign_keys = ON', done);
        }
    }
});

const DEFAULT_FEES = { 3: 450000 };
const SUBJECTS = {
    1: { code: 'MTH', name: 'Mathematics' },
    2: { code: 'PHY', name: 'Physics' },
    3: { code: 'ENG', name: 'English Language' },
    4: { code: 'BIO', name: 'Biology' }
};

function sendError(res, error, message = 'The request could not be completed.') {
    console.error(error);
    return res.status(500).json({ success: false, message });
}

function positiveInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
}

function getCbcDescriptor(totalScore) {
    if (totalScore >= 80) return { code: '3', label: 'Outstanding' };
    if (totalScore >= 60) return { code: '2', label: 'Moderate' };
    return { code: '1', label: 'Basic' };
}

async function addColumnIfMissing(table, column, add) {
    if (!(await db.schema.hasColumn(table, column))) {
        await db.schema.alterTable(table, add);
    }
}

async function initDatabase() {
    if (!(await db.schema.hasTable('students'))) {
        await db.schema.createTable('students', table => {
            table.increments('id').primary();
            table.string('regNo').unique().notNullable();
            table.string('fullName').notNullable();
            table.integer('classId').notNullable();
            table.string('className').notNullable();
            table.string('gender').defaultTo('');
            table.string('parentName').defaultTo('');
            table.string('parentPhone').defaultTo('');
            table.boolean('isBoarding').defaultTo(false);
        });
    } else {
        await addColumnIfMissing('students', 'gender', table => table.string('gender').defaultTo(''));
        await addColumnIfMissing('students', 'parentName', table => table.string('parentName').defaultTo(''));
        await addColumnIfMissing('students', 'parentPhone', table => table.string('parentPhone').defaultTo(''));
        await addColumnIfMissing('students', 'isBoarding', table => table.boolean('isBoarding').defaultTo(false));
    }

    if (!(await db.schema.hasTable('marks'))) {
        await db.schema.createTable('marks', table => {
            table.increments('id').primary();
            table.integer('studentId').notNullable();
            table.integer('classId').notNullable();
            table.integer('subjectId').notNullable();
            table.string('term').notNullable();
            table.float('formative').notNullable().defaultTo(0);
            table.float('exam').notNullable().defaultTo(0);
            table.unique(['studentId', 'classId', 'subjectId', 'term']);
        });
    }

    if (!(await db.schema.hasTable('ledger'))) {
        await db.schema.createTable('ledger', table => {
            table.integer('studentId').primary();
            table.float('totalFee').notNullable();
            table.float('amountPaid').notNullable().defaultTo(0);
            table.string('lastPaymentDate');
        });
    }

    if (!(await db.schema.hasTable('payment_logs'))) {
        await db.schema.createTable('payment_logs', table => {
            table.increments('id').primary();
            table.integer('studentId').notNullable();
            table.string('receiptNo').notNullable().unique();
            table.float('amountPaid').notNullable();
            table.string('paymentMethod').notNullable();
            table.string('paymentDate').notNullable();
            table.float('remainingBalance').notNullable();
        });
    }

    if (!(await db.schema.hasTable('system_license'))) {
        await db.schema.createTable('system_license', table => {
            table.integer('id').primary().defaultTo(1);
            table.boolean('active').notNullable().defaultTo(true);
            table.string('schoolName');
            table.string('licenseType');
            table.string('licenseKey');
            table.string('expiryDate');
            table.integer('daysRemaining');
            table.string('currentTerm');
        });
    }

    if ((await db('students').count({ count: '*' }).first()).count === 0) {
        await db('students').insert([
            { id: 101, regNo: 'SCH/2026/001', fullName: 'Mukasa Ronald', classId: 1, className: 'Senior 1 Blue', gender: 'M', parentName: 'Kato Paul', parentPhone: '+256772123456', isBoarding: false },
            { id: 102, regNo: 'SCH/2026/002', fullName: 'Nakalema Sarah', classId: 1, className: 'Senior 1 Blue', gender: 'F', parentName: 'Namubiru Grace', parentPhone: '+256701987654', isBoarding: false },
            { id: 103, regNo: 'SCH/2026/003', fullName: 'Okello David', classId: 3, className: 'P.7 Alpha', gender: 'M', parentName: 'Okello John', parentPhone: '+256782334455', isBoarding: true },
            { id: 104, regNo: 'SCH/2026/004', fullName: 'Achieng Brenda', classId: 2, className: 'Senior 2 Red', gender: 'F', parentName: 'Achieng Peter', parentPhone: '+256700000004', isBoarding: false },
            { id: 105, regNo: 'SCH/2026/005', fullName: 'Kato Paul', classId: 1, className: 'Senior 1 Blue', gender: 'M', parentName: 'Kato James', parentPhone: '+256700000005', isBoarding: false }
        ]);
    }

    if ((await db('ledger').count({ count: '*' }).first()).count === 0) {
        await db('ledger').insert([
            { studentId: 101, totalFee: 650000, amountPaid: 450000, lastPaymentDate: '2026-02-10' },
            { studentId: 102, totalFee: 650000, amountPaid: 650000, lastPaymentDate: '2026-02-01' },
            { studentId: 103, totalFee: 450000, amountPaid: 150000, lastPaymentDate: '2026-01-28' },
            { studentId: 104, totalFee: 650000, amountPaid: 0, lastPaymentDate: null },
            { studentId: 105, totalFee: 650000, amountPaid: 200000, lastPaymentDate: '2026-02-14' }
        ]);
    }

    if ((await db('marks').count({ count: '*' }).first()).count === 0) {
        await db('marks').insert([
            { studentId: 101, classId: 1, subjectId: 1, term: 'Term 1 2026', formative: 16, exam: 68 },
            { studentId: 102, classId: 1, subjectId: 1, term: 'Term 1 2026', formative: 18, exam: 74 },
            { studentId: 105, classId: 1, subjectId: 1, term: 'Term 1 2026', formative: 10, exam: 38 }
        ]);
    }

    if (!(await db('system_license').where({ id: 1 }).first())) {
        await db('system_license').insert({
            id: 1, active: true, schoolName: 'Acme Academy',
            licenseType: 'Enterprise School License', licenseKey: 'DEMO-LICENSE',
            expiryDate: '2026-12-15', daysRemaining: 87, currentTerm: 'Term 1 2026'
        });
    }
}

// Student admissions API
app.get('/api/students', async (_req, res) => {
    try {
        const students = await db('students').select('*').orderBy('fullName');
        res.json({ success: true, data: students });
    } catch (error) { sendError(res, error); }
});

app.post('/api/students', async (req, res) => {
    const { regNo, fullName, classId, className } = req.body || {};
    const id = positiveInteger(classId);
    if (typeof fullName !== 'string' || !fullName.trim() || !id || typeof className !== 'string' || !className.trim() || typeof regNo !== 'string' || !regNo.trim()) {
        return res.status(400).json({ success: false, message: 'Registration number, student name, class, and class name are required.' });
    }
    try {
        const student = {
            regNo: regNo.trim(), fullName: fullName.trim(), classId: id, className: className.trim(),
            gender: req.body.gender === 'F' ? 'F' : 'M',
            parentName: String(req.body.parentName || '').trim(),
            parentPhone: String(req.body.parentPhone || '').trim(),
            isBoarding: Boolean(req.body.isBoarding)
        };
        const created = await db.transaction(async trx => {
            const [studentId] = await trx('students').insert(student);
            await trx('ledger').insert({ studentId, totalFee: DEFAULT_FEES[id] || 650000, amountPaid: 0, lastPaymentDate: null });
            return trx('students').where({ id: studentId }).first();
        });
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ success: false, message: 'That registration number is already in use.' });
        sendError(res, error);
    }
});

app.put('/api/students/:id', async (req, res) => {
    const id = positiveInteger(req.params.id);
    const classId = positiveInteger(req.body?.classId);
    const { fullName, className } = req.body || {};
    if (!id || !classId || typeof fullName !== 'string' || !fullName.trim() || typeof className !== 'string' || !className.trim()) {
        return res.status(400).json({ success: false, message: 'Valid student name and class are required.' });
    }
    try {
        const existing = await db('students').where({ id }).first();
        if (!existing) return res.status(404).json({ success: false, message: 'Student not found.' });
        await db('students').where({ id }).update({
            fullName: fullName.trim(), classId, className: className.trim(),
            gender: req.body.gender === 'F' ? 'F' : 'M',
            parentName: String(req.body.parentName || '').trim(),
            parentPhone: String(req.body.parentPhone || '').trim(),
            isBoarding: Boolean(req.body.isBoarding)
        });
        res.json({ success: true, data: await db('students').where({ id }).first() });
    } catch (error) { sendError(res, error); }
});

app.delete('/api/students/:id', async (req, res) => {
    const id = positiveInteger(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid student id.' });
    try {
        const student = await db('students').where({ id }).first();
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
        if (await db('payment_logs').where({ studentId: id }).first()) {
            return res.status(409).json({ success: false, message: 'This student has payment history and cannot be deleted. Archive support should be used instead.' });
        }
        await db.transaction(async trx => {
            await trx('marks').where({ studentId: id }).del();
            await trx('ledger').where({ studentId: id }).del();
            await trx('students').where({ id }).del();
        });
        res.json({ success: true, message: 'Student deleted.' });
    } catch (error) { sendError(res, error); }
});

// Markbook API
app.get('/api/marks', async (req, res) => {
    const classId = positiveInteger(req.query.classId);
    const subjectId = positiveInteger(req.query.subjectId);
    const term = String(req.query.term || '').trim();
    if (!classId || !subjectId || !term) return res.status(400).json({ success: false, message: 'Class, subject, and term are required.' });
    try {
        const students = await db('students').where({ classId }).orderBy('fullName');
        const marks = await db('marks').where({ classId, subjectId, term });
        const data = students.map(student => {
            const record = marks.find(mark => Number(mark.studentId) === Number(student.id)) || { formative: 0, exam: 0 };
            const total = Number(record.formative || 0) + Number(record.exam || 0);
            return { studentId: student.id, regNo: student.regNo, studentName: student.fullName, formative: Number(record.formative || 0), exam: Number(record.exam || 0), total, descriptor: getCbcDescriptor(total) };
        });
        res.json({ success: true, data });
    } catch (error) { sendError(res, error); }
});

app.post('/api/marks/batch', async (req, res) => {
    const classId = positiveInteger(req.body?.classId);
    const subjectId = positiveInteger(req.body?.subjectId);
    const term = String(req.body?.term || '').trim();
    const marks = req.body?.marks;
    if (!classId || !subjectId || !term || term.length > 40 || !Array.isArray(marks) || marks.length > 500) {
        return res.status(400).json({ success: false, message: 'Valid class, subject, term, and marks are required.' });
    }
    for (const mark of marks) {
        const studentId = positiveInteger(mark?.studentId);
        const formative = Number(mark?.formative);
        const exam = Number(mark?.exam);
        if (!studentId || !Number.isFinite(formative) || formative < 0 || formative > 20 || !Number.isFinite(exam) || exam < 0 || exam > 80) {
            return res.status(400).json({ success: false, message: 'Each mark must have a valid student id, formative score (0–20), and exam score (0–80).' });
        }
    }
    try {
        await db.transaction(async trx => {
            for (const mark of marks) {
                const studentId = Number(mark.studentId);
                if (!(await trx('students').where({ id: studentId, classId }).first())) {
                    throw Object.assign(new Error('A student is not enrolled in the selected class.'), { status: 400 });
                }
                const values = { formative: Number(mark.formative), exam: Number(mark.exam) };
                const existing = await trx('marks').where({ studentId, classId, subjectId, term }).first();
                if (existing) await trx('marks').where({ id: existing.id }).update(values);
                else await trx('marks').insert({ studentId, classId, subjectId, term, ...values });
            }
        });
        res.json({ success: true, message: `Saved marks for ${marks.length} students.` });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        sendError(res, error);
    }
});

// Bursary API
app.get('/api/bursary/ledger', async (_req, res) => {
    try {
        const rows = await db('students').leftJoin('ledger', 'students.id', 'ledger.studentId').select(
            'students.id', 'students.regNo', 'students.fullName', 'students.classId', 'students.className',
            'ledger.totalFee', 'ledger.amountPaid', 'ledger.lastPaymentDate'
        ).orderBy('students.fullName');
        const data = rows.map(row => ({ ...row, totalFee: Number(row.totalFee || DEFAULT_FEES[row.classId] || 650000), amountPaid: Number(row.amountPaid || 0), balance: Math.max(0, Number(row.totalFee || DEFAULT_FEES[row.classId] || 650000) - Number(row.amountPaid || 0)) }));
        res.json({ success: true, data });
    } catch (error) { sendError(res, error); }
});

app.post('/api/bursary/pay', async (req, res) => {
    const studentId = positiveInteger(req.body?.studentId);
    const amountPaid = Number(req.body?.amountPaid);
    const receiptNo = typeof req.body?.receiptNo === 'string' ? req.body.receiptNo.trim() : '';
    const allowedMethods = ['Cash', 'Bank Deposit', 'Mobile Money'];
    const paymentMethod = String(req.body?.paymentMethod || 'Cash');
    const dateCandidate = req.body?.paymentDate ? new Date(req.body.paymentDate) : new Date();
    if (!studentId || !Number.isFinite(amountPaid) || amountPaid <= 0 || amountPaid > 1e9 || !receiptNo || receiptNo.length > 80 || !allowedMethods.includes(paymentMethod) || Number.isNaN(dateCandidate.getTime())) {
        return res.status(400).json({ success: false, message: 'Provide a valid student, positive amount, receipt number, payment method, and date.' });
    }
    const paymentDate = dateCandidate.toISOString().slice(0, 10);
    try {
        const payment = await db.transaction(async trx => {
            const ledger = await trx('ledger').where({ studentId }).first();
            if (!ledger) throw Object.assign(new Error('Student fee record not found.'), { status: 404 });
            if (await trx('payment_logs').where({ receiptNo }).first()) throw Object.assign(new Error('That receipt number has already been used.'), { status: 409 });
            const newAmountPaid = Number(ledger.amountPaid || 0) + amountPaid;
            const remainingBalance = Math.max(0, Number(ledger.totalFee) - newAmountPaid);
            await trx('ledger').where({ studentId }).update({ amountPaid: newAmountPaid, lastPaymentDate: paymentDate });
            const log = { studentId, receiptNo, amountPaid, paymentMethod, paymentDate, remainingBalance };
            const [id] = await trx('payment_logs').insert(log);
            return { id, ...log };
        });
        res.status(201).json({ success: true, data: payment, message: `Payment of ${amountPaid} logged successfully.` });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ success: false, message: 'That receipt number has already been used.' });
        sendError(res, error);
    }
});

// Student report API
app.get('/api/reports/student', async (req, res) => {
    const studentId = positiveInteger(req.query.studentId);
    const term = String(req.query.term || 'Term 1 2026').trim();
    if (!studentId || !term) return res.status(400).json({ success: false, message: 'A valid student and term are required.' });
    try {
        const student = await db('students').where({ id: studentId }).first();
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
        const records = await db('marks').where({ studentId, term });
        const subjects = records.map(record => {
            const subject = SUBJECTS[record.subjectId] || { code: `SUB${record.subjectId}`, name: `Subject ${record.subjectId}` };
            const formative = Number(record.formative || 0);
            const exam = Number(record.exam || 0);
            const total = formative + exam;
            const descriptor = getCbcDescriptor(total);
            return { ...subject, formative, exam, total, descriptorCode: descriptor.code, descriptorLabel: descriptor.label, teacherComment: '' };
        });
        res.json({ success: true, data: { studentName: student.fullName, regNo: student.regNo, className: student.className, term, subjects, headteacherComment: '' } });
    } catch (error) { sendError(res, error); }
});

// Prototype licensing API: activation is format-only, not production verification.
app.get('/api/system/license', async (_req, res) => {
    try {
        const license = await db('system_license').where({ id: 1 }).first();
        res.json({ success: true, data: license || null });
    } catch (error) { sendError(res, error); }
});

app.post('/api/system/license/activate', async (req, res) => {
    const licenseKey = typeof req.body?.licenseKey === 'string' ? req.body.licenseKey.trim() : '';
    if (licenseKey.length < 8 || licenseKey.length > 120) return res.status(400).json({ success: false, message: 'Invalid activation key format.' });
    try {
        await db('system_license').where({ id: 1 }).update({ active: true, licenseKey, daysRemaining: 120 });
        res.json({ success: true, message: 'Key format accepted (prototype only; no real license verification is performed).' });
    } catch (error) { sendError(res, error); }
});

app.get('/', (_req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});
app.use('/api', (_req, res) => res.status(404).json({ success: false, message: 'API endpoint not found.' }));
app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({ success: false, message: 'Request body must be valid JSON.' });
    }
    sendError(res, error);
});

initDatabase()
    .then(() => app.listen(PORT, () => console.log(`[School System] Running at http://localhost:${PORT}`)))
    .catch(async error => {
        console.error('[Database] Initialization failed:', error);
        await db.destroy();
        process.exitCode = 1;
    });
