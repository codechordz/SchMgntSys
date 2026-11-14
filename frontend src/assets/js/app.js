import { API } from './api.js';
import { initAdmissions } from './components/admissions.js';
import { initMarkbook } from './components/markbook.js';
import { initBursary } from './components/bursary.js';
import { initLicensing } from './components/licensing.js';
import { initReports } from './components/reports.js';
import { initDashboard } from './components/dashboard.js';

document.addEventListener('alpine:init', () => {
    Alpine.data('admissionsComponent', initAdmissions);
    Alpine.data('markbookComponent', initMarkbook);
    Alpine.data('bursaryComponent', initBursary);
    Alpine.data('licensingComponent', initLicensing);
    Alpine.data('reportsComponent', initReports);
    Alpine.data('dashboardComponent', initDashboard);

    // Replace static demo dashboard cards with live summary and timetable tools.
    const dashboard = [...document.querySelectorAll('main section')]
        .find(section => (section.getAttribute('x-show') || '').includes("currentView === 'dashboard'"));
    if (dashboard) {
        dashboard.innerHTML = `
            <div x-data="dashboardComponent" class="space-y-6">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p class="text-[11px] font-bold uppercase tracking-[.18em] text-blue-600">School overview</p>
                        <h2 class="mt-1 text-2xl font-black text-slate-900">Good day, <span x-text="teacherName || 'Teacher'"></span></h2>
                        <p class="mt-1 text-sm text-slate-500">Your school snapshot and teaching schedule for today.</p>
                    </div>
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <label class="sr-only" for="teacher-name">Your name</label>
                        <input id="teacher-name" type="text" x-model="teacherName" @change="saveTeacherName()" placeholder="Enter your name" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                        <button type="button" @click="enableNotifications()" class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700" x-text="notificationButtonLabel"></button>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div class="text-xs font-bold uppercase tracking-wide text-slate-400">Students enrolled</div><div class="mt-2 text-3xl font-black text-slate-900" x-text="loadingStats ? '…' : stats.students.toLocaleString()"></div><div class="mt-1 text-xs text-slate-500">Current student directory</div></div>
                    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div class="text-xs font-bold uppercase tracking-wide text-slate-400">Classes represented</div><div class="mt-2 text-3xl font-black text-indigo-600" x-text="loadingStats ? '…' : stats.classes"></div><div class="mt-1 text-xs text-slate-500">Based on enrolled students</div></div>
                    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div class="text-xs font-bold uppercase tracking-wide text-slate-400">Fees collected</div><div class="mt-2 text-3xl font-black text-emerald-600" x-text="loadingStats ? '…' : stats.collectionRate + '%' "></div><div class="mt-1 text-xs text-slate-500" x-text="'UGX ' + stats.paid.toLocaleString() + ' of ' + stats.fees.toLocaleString()"></div></div>
                    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div class="text-xs font-bold uppercase tracking-wide text-slate-400">Outstanding fees</div><div class="mt-2 text-3xl font-black text-amber-600" x-text="loadingStats ? '…' : 'UGX ' + stats.balance.toLocaleString()"></div><div class="mt-1 text-xs text-slate-500">Remaining student balances</div></div>
                </div>

                <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_.85fr]">
                    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="flex items-center justify-between gap-3">
                            <div><h3 class="font-bold text-slate-900">Today's timetable</h3><p class="mt-1 text-xs text-slate-500" x-text="todayLabel"></p></div>
                            <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700" x-text="todayLessons.length + ' lessons'"></span>
                        </div>
                        <div class="mt-4 space-y-3" x-show="todayLessons.length">
                            <template x-for="lesson in todayLessons" :key="lesson.id">
                                <article class="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <div class="min-w-[74px] rounded-lg bg-white px-2 py-2 text-center shadow-sm"><div class="text-sm font-black text-slate-800" x-text="lesson.startTime"></div><div class="text-[10px] text-slate-400" x-text="lesson.endTime"></div></div>
                                    <div class="min-w-0 flex-1"><div class="font-bold text-slate-800" x-text="lesson.subject"></div><div class="mt-1 text-xs text-slate-500" x-text="lesson.className + ' · ' + (lesson.room || 'Room not set')"></div><div class="mt-1 text-xs text-blue-700" x-text="'Teacher: ' + lesson.teacher"></div></div>
                                    <button type="button" @click="removeLesson(lesson.id)" class="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600" :aria-label="'Remove ' + lesson.subject">Remove</button>
                                </article>
                            </template>
                        </div>
                        <p x-show="!todayLessons.length" class="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No lessons scheduled for today. Add a lesson using the form.</p>
                        <div class="mt-5 border-t border-slate-100 pt-4">
                            <h4 class="text-sm font-bold text-slate-800">Add a timetable lesson</h4>
                            <form @submit.prevent="addLesson()" class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label class="text-xs font-semibold text-slate-600">Day<select x-model="form.day" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><template x-for="day in days" :key="day"><option :value="day" x-text="day"></option></template></select></label>
                                <label class="text-xs font-semibold text-slate-600">Teacher name<input x-model.trim="form.teacher" required maxlength="80" placeholder="Teacher name" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"></label>
                                <label class="text-xs font-semibold text-slate-600">Subject<input x-model.trim="form.subject" required maxlength="80" placeholder="e.g. Mathematics" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"></label>
                                <label class="text-xs font-semibold text-slate-600">Class<input x-model.trim="form.className" required maxlength="80" placeholder="e.g. Senior 1 Blue" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"></label>
                                <label class="text-xs font-semibold text-slate-600">Start time<input x-model="form.startTime" type="time" required class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"></label>
                                <label class="text-xs font-semibold text-slate-600">End time<input x-model="form.endTime" type="time" required class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"></label>
                                <label class="text-xs font-semibold text-slate-600 sm:col-span-2">Room (optional)<input x-model.trim="form.room" maxlength="50" placeholder="e.g. Room 4" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"></label>
                                <button type="submit" class="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 sm:col-span-2">Save lesson to this device</button>
                            </form>
                        </div>
                    </section>

                    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="flex items-center justify-between"><div><h3 class="font-bold text-slate-900">Next lessons</h3><p class="mt-1 text-xs text-slate-500">Your upcoming classes this week</p></div><i class="fa-solid fa-bell text-blue-500"></i></div>
                        <div class="mt-4 space-y-3" x-show="upcomingLessons.length">
                            <template x-for="lesson in upcomingLessons" :key="lesson.id">
                                <div class="flex gap-3 rounded-xl bg-slate-50 p-3"><div class="min-w-[52px] text-center"><div class="text-[10px] font-bold uppercase text-slate-400" x-text="lesson.day.slice(0, 3)"></div><div class="mt-1 text-sm font-black text-slate-800" x-text="lesson.startTime"></div></div><div><div class="text-sm font-bold text-slate-800" x-text="lesson.subject"></div><div class="mt-1 text-xs text-slate-500" x-text="lesson.className + ' · ' + lesson.teacher"></div></div></div>
                            </template>
                        </div>
                        <p x-show="!upcomingLessons.length" class="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Your upcoming timetable will appear here.</p>
                        <div class="mt-5 rounded-xl bg-blue-50 p-4 text-xs leading-relaxed text-blue-900"><div class="font-bold"><i class="fa-solid fa-circle-info me-1"></i> Lesson reminders</div><p class="mt-1">When browser notifications are enabled, this page reminds the matching teacher five minutes before a lesson. Keep this dashboard open on the device receiving reminders.</p></div>
                    </section>
                </div>
            </div>`;
    }

    Alpine.store('app', {
        currentView: 'dashboard',
        academicTerm: 'Term 1 2026',
        licenseStatus: { active: true, schoolName: 'Acme High School', expiryDate: '2026-12-15' },
        user: { name: 'Administrator', role: 'Admin' },
        setView(viewName) {
            this.currentView = viewName;
            window.location.hash = viewName;
        }
    });

    Alpine.store('toast', {
        visible: false,
        message: '',
        type: 'info',
        show(message, type = 'info') {
            this.message = message;
            this.type = type;
            this.visible = true;
            setTimeout(() => { this.visible = false; }, 4000);
        }
    });

    window.addEventListener('app-toast', event => {
        Alpine.store('toast').show(event.detail.message, event.detail.type);
    });
});
