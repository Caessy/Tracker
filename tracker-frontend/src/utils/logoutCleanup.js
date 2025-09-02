import { useAlertStore } from '../store/useAlertStore';
import { useAuthStore } from '../store/useAuthStore';
import { useConfirmDialogStore } from '../store/useConfirmDialogStore';
import { useSessionStore } from '../store/useSessionStore';



export function logoutCleanup(queryClient) {
    try {
        localStorage.removeItem('token');
    } catch (e) {
        console.error('remove token failed', e);
    }

    try {
        queryClient.clear();
    } catch (e) {
        console.error('queryClient.clear() failed', e);
    }

    try { useAuthStore.getState().reset?.(); } catch (e) {}
    try { useSessionStore.getState().reset?.(); } catch (e) {}
    try { useConfirmDialogStore.getState().reset?.(); } catch (e) {}
    try { useAlertStore.getState().reset?.(); } catch (e) {}
}