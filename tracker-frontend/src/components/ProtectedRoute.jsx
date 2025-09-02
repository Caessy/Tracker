import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

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

export default function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // if there is token, check if it expired
    const token = localStorage.getItem('token');
    const decoded = token ? safeDecodeJwtPayload(token) : null;
    const now = Math.floor(Date.now() / 1000);
    const valid = decoded && typeof decoded.exp === 'number' && decoded.exp > now && !decoded.temp;

    if (!valid) {
        // clear authStore
        try { useAuthStore.getState().reset?.(); } catch {}
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return children;
}