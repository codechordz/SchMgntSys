import { API } from '../api.js';

export function initMarkbook() {
    return {
        selectedClassId: 1,
        selectedSubjectId: 1,
        selectedTerm: 'Term 1 2026',
        isLoading: false,

        classes: [
            { id: 1, name: 'Senior 1 Blue', level: 'SecondaryCBC' },
            { id: 2, name: 'Senior 2 Red', level: 'SecondaryCBC' },
            { id: 3, name: 'P.7 Alpha', level: 'Primary' }
        ],

        subjects: [
            { id: 1, code: 'MTH', name: 'Mathematics' },
            { id: 2, code: 'PHY', name: 'Physics' },
            { id: 3, code: 'ENG', name: 'English Language' },
            { id: 4, code: 'BIO', name: 'Biology' }
        ],

        // Grid Rows State
        markRows: [],

        async init() {
            await this.loadMarksheet();
        },

        async loadMarksheet() {
            this.isLoading = true;
            const response = await API.get(`/marks?classId=${this.selectedClassId}&subjectId=${this.selectedSubjectId}&term=${encodeURIComponent(this.selectedTerm)}`);

            if (response.success && Array.isArray(response.data)) {
                this.markRows = response.data;
            } else {
                // Mock Fallback Data matching NCDC CBC Structure
                this.markRows = [
                    { studentId: 101, regNo: 'SCH/2026/001', studentName: 'Mukasa Ronald', formative: 16, exam: 68 },
                    { studentId: 102, regNo: 'SCH/2026/002', studentName: 'Nakalema Sarah', formative: 18, exam: 74 },
                    { studentId: 103, regNo: 'SCH/2026/003', studentName: 'Okello David', formative: 12, exam: 45 },
                    { studentId: 104, regNo: 'SCH/2026/004', studentName: 'Achieng Brenda', formative: 19, exam: 82 },
                    { studentId: 105, regNo: 'SCH/2026/005', studentName: 'Kato Paul', formative: 10, exam: 38 }
                ];
            }
            this.isLoading = false;
        },

        // Real-Time CBC Grade Calculations
        calculateTotal(row) {
            const formative = parseFloat(row.formative) || 0;
            const exam = parseFloat(row.exam) || 0;
            return Math.min(100, Math.max(0, formative + exam));
        },

        calculateDescriptor(total) {
            if (total >= 80) return { code: '3', label: 'Outstanding', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
            if (total >= 60) return { code: '2', label: 'Moderate', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
            return { code: '1', label: 'Basic', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
        },

        // KEYBOARD NAVIGATION CONTROLLER
        handleKeydown(event, rowIndex, fieldName) {
            const key = event.key;
            let targetRow = rowIndex;
            let targetField = fieldName;

            if (key === 'ArrowDown' || key === 'Enter') {
                event.preventDefault();
                targetRow = Math.min(this.markRows.length - 1, rowIndex + 1);
            } else if (key === 'ArrowUp') {
                event.preventDefault();
                targetRow = Math.max(0, rowIndex - 1);
            } else if (key === 'ArrowRight' && fieldName === 'formative') {
                event.preventDefault();
                targetField = 'exam';
            } else if (key === 'ArrowLeft' && fieldName === 'exam') {
                event.preventDefault();
                targetField = 'formative';
            } else {
                return; // Let regular number inputs work
            }

            // Move focus to target cell
            this.$nextTick(() => {
                const cell = document.querySelector(`input[data-cell="${targetRow}-${targetField}"]`);
                if (cell) {
                    cell.focus();
                    cell.select();
                }
            });
        },

        async saveAllMarks() {
            this.isLoading = true;
            const payload = {
                classId: this.selectedClassId,
                subjectId: this.selectedSubjectId,
                term: this.selectedTerm,
                marks: this.markRows
            };

            const response = await API.post('/marks/batch', payload);

            this.isLoading = false;
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: `Batch marks saved for ${this.markRows.length} students.`, type: 'success' }
            }));
        }
    };
}