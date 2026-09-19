/**
 * SchoolSMS Front-end API Client
 */
export const API = {
    baseUrl: '/api',

    async request(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || `Server returned status ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            console.error(`[API Error ${method} ${endpoint}]:`, error);
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: error.message || 'Connection error. Ensure backend is running.', type: 'error' }
            }));
            return { success: false, error: error.message };
        }
    },

    get(endpoint) { return this.request(endpoint, 'GET'); },
    post(endpoint, body) { return this.request(endpoint, 'POST', body); },
    put(endpoint, body) { return this.request(endpoint, 'PUT', body); },
    delete(endpoint) { return this.request(endpoint, 'DELETE'); }
};