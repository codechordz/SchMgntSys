import { API } from '../api.js';

export function initAdmissions() {
    return {
        students: [],
        classes: [
            { id: 1, name: 'Senior 1 Blue', level: 'SecondaryCBC' },
            { id: 2, name: 'Senior 1 Red', level: 'SecondaryCBC' },
            { id: 3, name: 'Senior 2 Blue', level: 'SecondaryCBC' },
            { id: 4, name: 'P.7 Alpha', level: 'Primary' }
        ],
        searchQuery: '',
        selectedClassFilter: '',
        isLoading: false,
        showModal: false,
        isEditing: false,

        // Form State
        formData: {
            id: null,
            regNo: '',
            fullName: '',
            gender: 'M',
            classId: 1,
            parentName: '',
            parentPhone: '',
            isBoarding: false
        },

        async init() {
            await this.loadStudents();
            this.generateRegNo();
        },

        async loadStudents() {
            this.isLoading = true;
            const response = await API.get('/students');

            if (response.success && Array.isArray(response.data)) {
                this.students = response.data;
            } else {
                // Fallback Mock Data for Frontend Testing
                this.students = [
                    { id: 101, regNo: 'SCH/2026/001', fullName: 'Mukasa Ronald', gender: 'M', classId: 1, className: 'Senior 1 Blue', parentName: 'Kato Paul', parentPhone: '+256772123456', isBoarding: true },
                    { id: 102, regNo: 'SCH/2026/002', fullName: 'Nakalema Sarah', gender: 'F', classId: 1, className: 'Senior 1 Blue', parentName: 'Namubiru Grace', parentPhone: '+256701987654', isBoarding: false },
                    { id: 103, regNo: 'SCH/2026/003', fullName: 'Okello David', gender: 'M', classId: 4, className: 'P.7 Alpha', parentName: 'Okello John', parentPhone: '+256782334455', isBoarding: true }
                ];
            }
            this.isLoading = false;
        },

        generateRegNo() {
            const currentYear = new Date().getFullYear();
            const nextIndex = String(this.students.length + 1).padStart(3, '0');
            this.formData.regNo = `SCH/${currentYear}/${nextIndex}`;
        },

        get filteredStudents() {
            return this.students.filter(student => {
                const matchesSearch = student.fullName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                                     student.regNo.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                                     student.parentName.toLowerCase().includes(this.searchQuery.toLowerCase());
                
                const matchesClass = !this.selectedClassFilter || student.classId == this.selectedClassFilter;

                return matchesSearch && matchesClass;
            });
        },

        openAddModal() {
            this.isEditing = false;
            this.formData = {
                id: null,
                regNo: '',
                fullName: '',
                gender: 'M',
                classId: this.classes[0]?.id || 1,
                parentName: '',
                parentPhone: '',
                isBoarding: false
            };
            this.generateRegNo();
            this.showModal = true;
        },

        openEditModal(student) {
            this.isEditing = true;
            this.formData = { ...student };
            this.showModal = true;
        },

        async saveStudent() {
            if (!this.formData.fullName || !this.formData.parentPhone) {
                window.dispatchEvent(new CustomEvent('app-toast', {
                    detail: { message: 'Please fill in Student Name and Parent Contact.', type: 'warning' }
                }));
                return;
            }

            this.isLoading = true;
            const targetClass = this.classes.find(c => c.id == this.formData.classId);
            const payload = { ...this.formData, className: targetClass ? targetClass.name : 'Unassigned' };

            let result;
            if (this.isEditing) {
                result = await API.put(`/students/${this.formData.id}`, payload);
            } else {
                result = await API.post('/students', payload);
            }

            // UI Update regardless of API connection (Mock Fallback support)
            if (this.isEditing) {
                const index = this.students.findIndex(s => s.id === this.formData.id);
                if (index !== -1) this.students[index] = payload;
                window.dispatchEvent(new CustomEvent('app-toast', {
                    detail: { message: 'Student record updated successfully.', type: 'success' }
                }));
            } else {
                payload.id = Date.now();
                this.students.unshift(payload);
                window.dispatchEvent(new CustomEvent('app-toast', {
                    detail: { message: `Enrolled ${payload.fullName} (${payload.regNo}).`, type: 'success' }
                }));
            }

            this.isLoading = false;
            this.showModal = false;
        },

        async deleteStudent(id, name) {
            if (!confirm(`Are you sure you want to remove ${name} from the admissions register?`)) return;

            await API.delete(`/students/${id}`);
            this.students = this.students.filter(s => s.id !== id);

            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: 'Student deleted from registry.', type: 'info' }
            }));
        }
    };
}