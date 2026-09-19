import { API } from '../api.js';

export function initReports() {
    return {
        selectedClassId: 1,
        selectedStudentId: 101,
        selectedTerm: 'Term 1 2026',
        isLoading: false,

        classes: [
            { id: 1, name: 'Senior 1 Blue' },
            { id: 2, name: 'Senior 2 Red' },
            { id: 3, name: 'P.7 Alpha' }
        ],

        students: [],

        reportData: {
            studentName: '',
            regNo: '',
            className: '',
            term: '',
            subjects: [],
            headteacherComment: 'A very disciplined student who demonstrates solid understanding across key CBC competencies.'
        },

        async init() {
            await this.loadStudentsForClass();
            await this.loadReportCard();
        },

        async loadStudentsForClass() {
            // Load students matching the selected class filter
            const response = await API.get('/bursary/ledger');
            if (response.success && Array.isArray(response.data)) {
                this.students = response.data.filter(s => s.classId == this.selectedClassId);
                if (this.students.length > 0 && !this.students.some(s => s.id == this.selectedStudentId)) {
                    this.selectedStudentId = this.students[0].id;
                }
            } else {
                // Fallback mock students
                this.students = [
                    { id: 101, fullName: 'Mukasa Ronald', regNo: 'SCH/2026/001' },
                    { id: 102, fullName: 'Nakalema Sarah', regNo: 'SCH/2026/002' },
                    { id: 105, fullName: 'Kato Paul', regNo: 'SCH/2026/005' }
                ];
            }
        },

        async loadReportCard() {
            this.isLoading = true;
            const response = await API.get(`/reports/student?studentId=${this.selectedStudentId}&term=${encodeURIComponent(this.selectedTerm)}`);

            if (response.success && response.data) {
                this.reportData = response.data;
            } else {
                // Mock NCDC CBC Assessment Fallback
                const currentStudent = this.students.find(s => s.id == this.selectedStudentId) || { fullName: 'Mukasa Ronald', regNo: 'SCH/2026/001' };
                
                this.reportData = {
                    studentName: currentStudent.fullName,
                    regNo: currentStudent.regNo,
                    className: 'Senior 1 Blue',
                    term: this.selectedTerm,
                    subjects: [
                        { code: 'MTH', name: 'Mathematics', formative: 16, exam: 68, total: 84, descriptorCode: '3', descriptorLabel: 'Outstanding', teacherComment: 'Grasps numerical logic efficiently.' },
                        { code: 'PHY', name: 'Physics', formative: 14, exam: 58, total: 72, descriptorCode: '2', descriptorLabel: 'Moderate', teacherComment: 'Shows steady progress in practical experiments.' },
                        { code: 'ENG', name: 'English Language', formative: 18, exam: 70, total: 88, descriptorCode: '3', descriptorLabel: 'Outstanding', teacherComment: 'Excellent articulation and essay structuring.' },
                        { code: 'BIO', name: 'Biology', formative: 12, exam: 45, total: 57, descriptorCode: '1', descriptorLabel: 'Basic', teacherComment: 'Needs to review core biological diagrams.' }
                    ],
                    headteacherComment: 'Mukasa demonstrates great potential. With continued dedication in science subjects, outstanding performance is well within reach.'
                };
            }
            this.isLoading = false;
        },

        calculateAverageScore() {
            if (!this.reportData.subjects || this.reportData.subjects.length === 0) return 0;
            const totalSum = this.reportData.subjects.reduce((sum, s) => sum + (s.total || 0), 0);
            return Math.round(totalSum / this.reportData.subjects.length);
        },

        getOverallDescriptor(average) {
            if (average >= 80) return { code: '3', label: 'Outstanding Competency', bg: 'bg-emerald-100 text-emerald-800' };
            if (average >= 60) return { code: '2', label: 'Moderate Competency', bg: 'bg-blue-100 text-blue-800' };
            return { code: '1', label: 'Basic Competency', bg: 'bg-amber-100 text-amber-800' };
        },

        printReportCard() {
            window.print();
        }
    };
}