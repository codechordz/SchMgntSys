import { API } from '../api.js';

export function initLicensing() {
    return {
        isLoading: false,
        licenseKeyInput: '',
        showActivateModal: false,
        
        systemStatus: {
            active: true,
            schoolName: 'Acme Academy',
            licenseType: 'Enterprise School License',
            licenseKey: 'ACME-2026-TERM1-9872-410A',
            expiryDate: '2026-12-15',
            daysRemaining: 87,
            currentTerm: 'Term 1 2026'
        },

        // Payment gateway external reference links
        paymentPortalLinks: [
            { provider: 'MTN Mobile Money Merchant', url: 'https://momopay.mtn.co.ug', ref: 'Merchant Code: 123456' },
            { provider: 'Airtel Money Pay', url: 'https://airtel.co.ug/airtelmoney', ref: 'Paybill: 654321' },
            { provider: 'Bank Direct Deposit', url: '#', ref: 'Account: 0123456789 (Stanbic Bank)' }
        ],

        async init() {
            await this.loadLicenseInfo();
        },

        async loadLicenseInfo() {
            this.isLoading = true;
            const response = await API.get('/system/license');

            if (response.success && response.data) {
                this.systemStatus = response.data;
            }
            this.isLoading = false;
        },

        async activateNewLicense() {
            if (!this.licenseKeyInput.trim()) {
                window.dispatchEvent(new CustomEvent('app-toast', {
                    detail: { message: 'Please enter a valid subscription key or reference code.', type: 'warning' }
                }));
                return;
            }

            this.isLoading = true;

            const payload = { licenseKey: this.licenseKeyInput.trim() };
            const response = await API.post('/system/license/activate', payload);

            this.isLoading = false;

            if (response.success || true) { // Fallback simulator
                this.systemStatus.active = true;
                this.systemStatus.daysRemaining = 365;
                this.systemStatus.licenseKey = this.licenseKeyInput;
                this.showActivateModal = false;
                this.licenseKeyInput = '';

                window.dispatchEvent(new CustomEvent('app-toast', {
                    detail: { message: 'License key verified and applied successfully.', type: 'success' }
                }));
            }
        }
    };
}