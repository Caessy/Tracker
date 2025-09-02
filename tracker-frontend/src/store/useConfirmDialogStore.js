import { create } from "zustand";

const initialState = {
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
};

export const useConfirmDialogStore = create((set) => ({
    ...initialState,

    show: ({ title, message, onConfirm, onCancel }) =>
        set({ open: true, title, message, onConfirm, onCancel }),

    close: () => set({ ...initialState }),

    reset: () => set({ ...initialState }),
}));