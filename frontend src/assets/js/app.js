import { API } from './api.js';
import { initAdmissions } from './components/admissions.js';
import { initMarkbook } from './components/markbook.js';
import { initBursary } from './components/bursary.js';
import {initLicensing} from './components/licensing.js';
import {initReports} from './components/reports.js';
document.addEventListener('alpine:init', () => {
    // Register Admissions Data Component
    Alpine.data('admissionsComponent', initAdmissions);
    Alpine.data('markbookComponent', initMarkbook);
    Alpine.data('bursaryComponent', initBursary);
    Alpine.data( 'licensingComponent',initLicensing);
    Alpine.data( 'reportsComponent',initReports);
    Alpine.store('app', {
        currentView: 'dashboard',
        academicTerm: 'Term 1 2026',
        licenseStatus: {
            active: true,
            schoolName: 'Acme High School',
            expiryDate: '2026-12-15'
        },
        user: {
            name: 'Administrator',
            role: 'Admin'
        },
        
        setView(viewName) {
            this.currentView = viewName;
            window.location.hash = viewName;
        }
    });

    Alpine.store('toast', {
        visible: false,
        message: '',
        type: 'info', // 'success', 'error', 'info', 'warning'
        show(message, type = 'info') {
            this.message = message;
            this.type = type;
            this.visible = true;
            setTimeout(() => { this.visible = false; }, 4000);
        }
    });

    window.addEventListener('app-toast', (e) => {
        Alpine.store('toast').show(e.detail.message, e.detail.type);
    });
});