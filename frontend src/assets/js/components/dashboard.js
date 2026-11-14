const STORAGE_KEY = 'schmgntsys-timetable-v1';
const TEACHER_KEY = 'schmgntsys-teacher-name';
const ALERTS_KEY = 'schmgntsys-lesson-alerts-v1';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
}

export function initDashboard() {
    return {
        days: DAYS.slice(1).concat(DAYS[0]),
        teacherName: localStorage.getItem(TEACHER_KEY) || '',
        lessons: readJson(STORAGE_KEY, []),
        loadingStats: true,
        stats: { students: 0, classes: 0, paid: 0, fees: 0, balance: 0, collectionRate: 0 },
        form: { day: DAYS[(new Date().getDay() + 6) % 7], teacher: localStorage.getItem(TEACHER_KEY) || '', subject: '', className: '', startTime: '', endTime: '', room: '' },
        timer: null,
        notified: readJson(ALERTS_KEY, {}),

        get notificationButtonLabel() {
            if (!('Notification' in window)) return 'Notifications unsupported';
            if (Notification.permission === 'granted') return 'Notifications enabled';
            if (Notification.permission === 'denied') return 'Notifications blocked';
            return 'Enable lesson reminders';
        },
        get todayLabel() {
            return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
        },
        get todayLessons() {
            const today = DAYS[new Date().getDay()];
            return this.lessons.filter(lesson => lesson.day === today)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
        },
        get upcomingLessons() {
            const today = new Date().getDay();
            return this.lessons.map(lesson => ({ ...lesson, daysAway: (DAYS.indexOf(lesson.day) - today + 7) % 7 }))
                .filter(lesson => lesson.daysAway > 0 || lesson.startTime >= this.currentTime())
                .sort((a, b) => a.daysAway - b.daysAway || a.startTime.localeCompare(b.startTime))
                .slice(0, 5);
        },

        async init() {
            this.saveLessons();
            await this.loadStats();
            this.timer = window.setInterval(() => this.checkLessonReminders(), 15000);
            this.checkLessonReminders();
        },
        currentTime() {
            const now = new Date();
            return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        },
        saveLessons() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.lessons));
        },
        saveTeacherName() {
            this.teacherName = this.teacherName.trim();
            localStorage.setItem(TEACHER_KEY, this.teacherName);
            this.form.teacher = this.teacherName;
        },
        async loadStats() {
            this.loadingStats = true;
            const [studentsResponse, ledgerResponse] = await Promise.all([
                API.get('/students'), API.get('/bursary/ledger')
            ]);
            const students = studentsResponse.success && Array.isArray(studentsResponse.data) ? studentsResponse.data : [];
            const ledger = ledgerResponse.success && Array.isArray(ledgerResponse.data) ? ledgerResponse.data : [];
            const paid = ledger.reduce((sum, row) => sum + Number(row.amountPaid || 0), 0);
            const fees = ledger.reduce((sum, row) => sum + Number(row.totalFee || 0), 0);
            this.stats = {
                students: students.length,
                classes: new Set(students.map(student => student.className).filter(Boolean)).size,
                paid,
                fees,
                balance: ledger.reduce((sum, row) => sum + Math.max(0, Number(row.totalFee || 0) - Number(row.amountPaid || 0)), 0),
                collectionRate: fees ? Math.round((paid / fees) * 100) : 0
            };
            this.loadingStats = false;
        },
        addLesson() {
            const { day, teacher, subject, className, startTime, endTime, room } = this.form;
            if (!day || !teacher.trim() || !subject.trim() || !className.trim() || !startTime || !endTime || endTime <= startTime) {
                window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Enter the lesson details and make sure its end time is after its start time.', type: 'warning' } }));
                return;
            }
            this.lessons.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, day, teacher: teacher.trim(), subject: subject.trim(), className: className.trim(), startTime, endTime, room: room.trim() });
            this.lessons.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime));
            this.saveLessons();
            this.form = { day: this.form.day, teacher: this.teacherName || teacher.trim(), subject: '', className: '', startTime: '', endTime: '', room: '' };
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Lesson added to this device’s timetable.', type: 'success' } }));
        },
        removeLesson(id) {
            this.lessons = this.lessons.filter(lesson => lesson.id !== id);
            this.saveLessons();
        },
        async enableNotifications() {
            if (!('Notification' in window)) {
                window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'This browser does not support desktop notifications.', type: 'warning' } }));
                return;
            }
            if (Notification.permission === 'granted') return;
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Lesson reminders are enabled for this browser.', type: 'success' } }));
                this.checkLessonReminders();
            } else {
                window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Notifications were not allowed. You can enable them in your browser site settings.', type: 'warning' } }));
            }
        },
        checkLessonReminders() {
            if (!('Notification' in window) || Notification.permission !== 'granted') return;
            const now = new Date();
            const day = DAYS[now.getDay()];
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const todayKey = now.toLocaleDateString('en-CA');
            let changed = false;
            for (const lesson of this.lessons) {
                if (lesson.day !== day || (this.teacherName.trim() && lesson.teacher.toLowerCase() !== this.teacherName.trim().toLowerCase())) continue;
                const [hours, minutes] = lesson.startTime.split(':').map(Number);
                const minutesUntil = hours * 60 + minutes - currentMinutes;
                const alertKey = `${todayKey}:${lesson.id}`;
                if (minutesUntil >= 0 && minutesUntil <= 5 && !this.notified[alertKey]) {
                    const detail = `${lesson.subject} · ${lesson.className}${lesson.room ? ` · ${lesson.room}` : ''} starts at ${lesson.startTime}.`;
                    new Notification(`Lesson in ${minutesUntil} min`, { body: detail, tag: alertKey });
                    this.notified[alertKey] = true;
                    changed = true;
                    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `Reminder: ${lesson.subject} with ${lesson.className} at ${lesson.startTime}.`, type: 'info' } }));
                }
            }
            if (changed) {
                const keys = Object.keys(this.notified).slice(-200);
                this.notified = Object.fromEntries(keys.map(key => [key, this.notified[key]]));
                localStorage.setItem(ALERTS_KEY, JSON.stringify(this.notified));
            }
        }
    };
}
