import axios from 'axios';

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    withCredentials: true, // Needed for HttpOnly cookies (refresh token)
    timeout: 45000, // 45-second timeout to accommodate serverless database cold-starts & latency
});

// Request interceptor to attach access token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
            if (token && token !== 'undefined' && token !== 'null') {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle expired access tokens and transient server restarts
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

        // 1. Transparent retry for transient network drops or server restarts
        if (!error.response && originalRequest && !(originalRequest as any)._networkRetry && !isAuthEndpoint) {
            (originalRequest as any)._networkRetry = true;
            await new Promise((resolve) => setTimeout(resolve, 1200));
            return api(originalRequest);
        }

        // 2. Token refresh for 401 Unauthorized
        if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry && !isAuthEndpoint) {
            (originalRequest as any)._retry = true;
            try {
                const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
                const { data } = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true, timeout: 10000 });
                const newAccessToken = data.data.accessToken;

                localStorage.setItem('accessToken', newAccessToken);
                localStorage.setItem('token', newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed: clear credentials to prevent invalid zombie sessions
                localStorage.removeItem('accessToken');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);
