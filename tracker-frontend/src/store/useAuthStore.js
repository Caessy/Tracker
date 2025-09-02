import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getMe } from '../services/api';

const initialState = {
    user: null,
    isAuthenticated: false,
};

// decode JWT payload safely
function safeDecodeJwtPayload(token) {
    try {
        const payload = token.split('.')[1];
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

export const useAuthStore = create(
    persist(
        (set, get) => ({
            ...initialState,

            setUser: (newUser) =>
                set({
                    user: newUser ? { ...newUser, mfa_enabled: newUser.mfa_enabled ?? false } : null,
                    isAuthenticated: !!newUser,
                }),
            
            logout: async () => {
                try { localStorage.removeItem('token'); } catch (e) {}
                set({ ...initialState });

                try {
                    useAuthStore.persist?.clearStorage?.();
                    useAuthStore.persist?.reconfigure?.({ name: 'auth-storage' });
                } catch (e) {}

                try { localStorage.removeItem('auth-storage'); } catch (e) {}
            },

            reset: async () => {
                await get().logout();
            },

            loadUser: async () => {
                const token = localStorage.getItem('token');
                if (!token) {
                    set({ ...initialState });
                    return;
                }

                const decoded = safeDecodeJwtPayload(token);
                if (!decoded) {
                    await get().logout();
                    return;
                }

                if (decoded.temp) return;

                // check if exp expires
                const nowSec = Math.floor(Date.now() / 1000);
                if (typeof decoded.exp === 'number' && decoded.exp <= nowSec) {
                    await get().logout();
                    return;
                }

                try {
                    const res = await getMe();
                    const user = res?.data?.user ?? null;
                    if (user) {
                        set({
                            user: { ...user, mfa_enabled: user.mfa_enabled ?? false },
                            isAuthenticated: true,
                        });
                    } else {
                        await get().logout();
                    }
                } catch (e) {
                    await get().logout();
                }
            },
        }),
        {
        name: 'auth-storage',
        }
    )
);