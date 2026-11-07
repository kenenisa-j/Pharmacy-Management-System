import { create } from 'zustand';
import { api } from '../lib/api';

export interface User {
    id: string;
    email: string;
    role: string;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    setAuth: (user: User, accessToken: string) => void;
    clearAuth: () => void;
}

function getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
            return null;
        }

        // Verify JWT expiration if format is valid
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                // Token expired
                localStorage.removeItem('accessToken');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                return null;
            }
        }
        return token;
    } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
    }
}

function getStoredUser(validToken: string | null): User | null {
    if (typeof window === 'undefined' || !validToken) return null;
    try {
        const raw = localStorage.getItem('user');
        if (raw && raw !== 'undefined' && raw !== 'null') {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.id && parsed.email && parsed.role) {
                return parsed;
            }
        }

        // Fallback: decode user directly from the valid token's JWT payload
        const parts = validToken.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.userId && payload.email && payload.role) {
                const recoveredUser: User = {
                    id: payload.userId,
                    email: payload.email,
                    role: payload.role,
                };
                localStorage.setItem('user', JSON.stringify(recoveredUser));
                return recoveredUser;
            }
        }
    } catch {
        localStorage.removeItem('user');
    }
    return null;
}

const initialToken = getStoredToken();
const initialUser = getStoredUser(initialToken);
const isInitiallyAuthenticated = Boolean(initialToken && initialUser);

export const useAuthStore = create<AuthState>((set) => ({
    user: isInitiallyAuthenticated ? initialUser : null,
    accessToken: isInitiallyAuthenticated ? initialToken : null,
    isAuthenticated: isInitiallyAuthenticated,

    setAuth: (user, accessToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, accessToken, isAuthenticated: true });
    },

    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { user, accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, accessToken, isAuthenticated: true });
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (e) {
            console.warn('Logout API request failed:', e);
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            set({ user: null, accessToken: null, isAuthenticated: false });
        }
    },

    clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, accessToken: null, isAuthenticated: false });
    },
}));
