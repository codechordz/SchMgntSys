import { API } from '../api.js';

export function initBursary() {
    return {
        selectedClassFilter: '',
        searchQuery: '',
        filterDefaultersOnly: false,
        isLoading: false,
        showPaymentModal: false,
        
        // Default Term Tuition Structure (UGX)
        tuitionFeeMap: {
            1: 650000, // Senior 1 Blue
            2: 650000, // Senior 2 Red
            3: 450000  // P.7 Alpha
        },

        classes: [
            { id: 1, name: 'Senior 1 Blue' },
            { id: 2, name: 'Senior 2 Red' },
            { id: 3, name: 'P.7 Alpha' }
        ],

        // Payment Form State
        paymentForm: {
            studentId: null,
            studentName: '',
            regNo: '',
            className: '',
            termFee: 0,
            previousPaid: 0,
            amountToPay: 0,
            paymentMethod: 'Cash',
            receiptNo: ''
        },

        // Student Fee Ledger Data
        ledgerRows: [],

        async init() {
            await this.loadLedger();
        },

        async loadLedger() {
            this.isLoading = true;
            const response = await API.get('/bursary/ledger');

            if (response.success && Array.isArray(response.data)) {
                this.ledgerRows = response.data;
            } else {
                // Mock Ledger Data (UGX)
                this.ledgerRows = [
                    { id: 101, regNo: 'SCH/2026/001', fullName: 'Mukasa Ronald', classId: 1, className: 'Senior 1 Blue', totalFee: 650000, amountPaid: 450000, lastPaymentDate: '2026-02-10' },
                    { id: 102, regNo: 'SCH/2026/002', fullName: 'Nakalema Sarah', classId: 1, className: 'Senior 1 Blue', totalFee: 650000, amountPaid: 650000, lastPaymentDate: '2026-02-01' },
                    { id: 103, regNo: 'SCH/2026/003', fullName: 'Okello David', classId: 3, className: 'P.7 Alpha', totalFee: 450000, amountPaid: 150000, lastPaymentDate: '2026-01-28' },
                    { id: 104, regNo: 'SCH/2026/004', fullName: 'Achieng Brenda', classId: 2, className: 'Senior 2 Red', totalFee: 650000, amountPaid: 0, lastPaymentDate: 'N/A' }
                ];
            }
            this.isLoading = false;
        },

        calculateBalance(row) {
            return Math.max(0, row.totalFee - row.amountPaid);
        },

        get filteredLedger() {
            return this.ledgerRows.filter(row => {
                const matchesSearch = row.fullName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                                     row.regNo.toLowerCase().includes(this.searchQuery.toLowerCase());
                const matchesClass = !this.selectedClassFilter || row.classId == this.selectedClassFilter;
                const matchesDefaulter = !this.filterDefaultersOnly || this.calculateBalance(row) > 0;

                return matchesSearch && matchesClass && matchesDefaulter;
            });
        },

        generateReceiptNo() {
            const timestamp = Math.floor(1000 + Math.random() * 9000);
            return `REC/2026/${timestamp}`;
        },

        openPaymentModal(row) {
            this.paymentForm = {
                studentId: row.id,
                studentName: row.fullName,
                regNo: row.regNo,
                className: row.className,
                termFee: row.totalFee,
                previousPaid: row.amountPaid,
                amountToPay: this.calculateBalance(row),
                paymentMethod: 'Cash',
                receiptNo: this.generateReceiptNo()
            };
            this.showPaymentModal = true;
        },

        async processPayment() {
            const amount = parseFloat(this.paymentForm.amountToPay) || 0;
            if (amount <= 0) {
                window.dispatchEvent(new CustomEvent('app-toast', {
                    detail: { message: 'Enter a valid payment amount greater than zero.', type: 'warning' }
                }));
                return;
            }

            this.isLoading = true;

            const payload = {
                studentId: this.paymentForm.studentId,
                amountPaid: amount,
                receiptNo: this.paymentForm.receiptNo,
                paymentMethod: this.paymentForm.paymentMethod,
                paymentDate: new Date().toISOString()
            };

            await API.post('/bursary/pay', payload);

            // Local Ledger State Update
            const index = this.ledgerRows.findIndex(r => r.id === this.paymentForm.studentId);
            if (index !== -1) {
                this.ledgerRows[index].amountPaid += amount;
                this.ledgerRows[index].lastPaymentDate = new Date().toISOString().split('T')[0];
            }

            this.isLoading = false;
            this.showPaymentModal = false;

            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: `Payment of UGX ${amount.toLocaleString()} logged (${this.paymentForm.receiptNo}).`, type: 'success' }
            }));

            // Trigger Receipt Print Prompt
            this.triggerReceiptPrint(this.paymentForm, amount);
        },

        triggerReceiptPrint(data, paidNow) {
            const printableArea = document.getElementById('printable-area');
            if (!printableArea) return;

            const balanceLeft = Math.max(0, (data.termFee - (data.previousPaid + paidNow)));

            printableArea.innerHTML = `
                <div class="p-8 max-w-xl mx-auto border-2 border-slate-900 font-sans text-slate-900 bg-white">
                    <div class="text-center border-b-2 border-slate-900 pb-4 mb-4">
                        <h2 class="text-xl font-black uppercase tracking-wider">ACME ACADEMY BURSARY</h2>
                        <p class="text-xs font-bold">OFFICIAL PAYMENT RECEIPT</p>
                    </div>

                    <div class="flex justify-between text-xs font-mono mb-4">
                        <div><b>RECEIPT NO:</b> ${data.receiptNo}</div>
                        <div><b>DATE:</b> ${new Date().toLocaleDateString()}</div>
                    </div>

                    <table class="w-full text-xs text-left mb-6 border-collapse">
                        <tr class="border-b"><td class="py-1 font-bold">Student Name:</td><td>${data.studentName}</td></tr>
                        <tr class="border-b"><td class="py-1 font-bold">Reg Number:</td><td class="font-mono">${data.regNo}</td></tr>
                        <tr class="border-b"><td class="py-1 font-bold">Class & Stream:</td><td>${data.className}</td></tr>
                        <tr class="border-b"><td class="py-1 font-bold">Payment Method:</td><td>${data.paymentMethod}</td></tr>
                    </table>

                    <div class="bg-slate-100 p-4 rounded-lg space-y-1 text-xs mb-6 font-mono">
                        <div class="flex justify-between"><span>Term Tuition Fee:</span> <span>UGX ${data.termFee.toLocaleString()}</span></div>
                        <div class="flex justify-between"><span>Previously Paid:</span> <span>UGX ${data.previousPaid.toLocaleString()}</span></div>
                        <div class="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-1"><span>Amount Paid Now:</span> <span>UGX ${paidNow.toLocaleString()}</span></div>
                        <div class="flex justify-between text-rose-600 font-bold border-t border-slate-300 pt-1"><span>Remaining Balance:</span> <span>UGX ${balanceLeft.toLocaleString()}</span></div>
                    </div>

                    <div class="flex justify-between items-end pt-8 text-[10px] uppercase font-bold">
                        <div>Bursar Signature: _____________________</div>
                        <div>School Stamp</div>
                    </div>
                </div>
            `;

            setTimeout(() => { window.print(); }, 300);
        }
    };
}