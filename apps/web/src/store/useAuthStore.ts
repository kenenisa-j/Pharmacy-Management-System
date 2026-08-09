import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
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
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    accessToken: localStorage.getItem('accessToken'),
    isAuthenticated: !!localStorage.getItem('accessToken'),

    setAuth: (user, accessToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
        set({ user, accessToken, isAuthenticated: true });
    },

    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { user, accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
        set({ user, accessToken, isAuthenticated: true });
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('token');
            set({ user: null, accessToken: null, isAuthenticated: false });
        }
    },
}));