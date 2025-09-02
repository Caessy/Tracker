import { create } from 'zustand';

const initialAlert = {
    open: false,
    message: '',
    severity: 'info',
};

export const useAlertStore = create((set, get) => ({
    alert: { ...initialAlert },

    showAlert: (message, severity = 'info') =>
        set({
            alert: {open: true, message, severity },
        }),
    
    closeAlert: () =>
        set({
            alert: { ...get().alert, open: false },
        }),

    reset: () =>
        set({ alert: { ...initialAlert } }),
}));