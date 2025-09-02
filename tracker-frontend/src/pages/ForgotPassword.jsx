import { useState, useEffect } from 'react';
import { Box, TextField, Button, Alert, Snackbar, IconButton, InputAdornment, Stack } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '../services/api';

function ForgotPassword() {
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const navigate = useNavigate();

    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;

    const handleStep1 = async () => {
        if (!username || !email) {
        setError('Username and email cannot be blank');
        return;
        }
        setLoading(true);
        setError('');
        try {
        const res = await api.post('/auth/forgot-password', { username, email });
        setSnackbar({ open: true, message: 'Token has been sent to your email, please check', severity: 'success' });
        setUserId(res.data.userId);
        setStep(2);
        setResendTimer(60);
        } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to send token');
        } finally {
        setLoading(false);
        }
    };

    const handleStep2 = async () => {
        if (!token) {
        setError('Please enter the token sent to your email');
        return;
        }
        setLoading(true);
        setError('');
        try {
        await api.post('/auth/verify-token', { resetToken: token, userId });
        setStep(3);
        setSnackbar({ open: true, message: 'Token verified', severity: 'success' });
        } catch (err) {
        setError(err.response?.data?.error?.message || 'Invalid token');
        if (err.response?.data?.error?.message?.includes('expired')) setStep(1);
        } finally {
        setLoading(false);
        }
    };

    const handleResend = async () => {
        try {
        await api.post('/auth/resend-token', { userId });
        setResendTimer(60);
        setSnackbar({ open: true, message: 'Token resent', severity: 'success' });
        } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to resend token');
        }
    };

    const handleStep3 = async () => {
        if (!newPassword) {
        setError('Please enter new password');
        return;
        }
        if (!passwordRegex.test(newPassword)) {
        setError('Your password must contain uppercase, lowercase, number and special character with a length of 8 to 128');
        return;
        }
        if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
        }
        setLoading(true);
        setError('');
        try {
        await api.post('/auth/reset-password', { userId, newPassword });
        setSnackbar({ open: true, message: 'Password reset successful, please login', severity: 'success' });
        setTimeout(() => navigate('/login'), 1000);
        } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to reset');
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        if (resendTimer <= 0) return;
        const timer = setInterval(() => setResendTimer(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [resendTimer]);

    return (
        
        <Box>
        <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            {step === 1 && (
            <Stack spacing={2}>
                <TextField
                required
                label="Username"
                fullWidth
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                />
                <TextField
                required
                label="Email"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                />

                <Button onClick={handleStep1} variant="contained" color="error" fullWidth disabled={loading}>
                {loading ? 'Sending...' : 'Send Token'}
                </Button>

                <Button component={RouterLink} to="/login" variant="text">
                Back to Login
                </Button>
            </Stack>
            )}

            {step === 2 && (
            <Stack spacing={2}>
                <TextField
                required
                label="Token"
                fullWidth
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(''); }}
                />

                <Button onClick={handleStep2} variant="contained" color="error" fullWidth disabled={loading}>
                {loading ? 'Verifying...' : 'Verify'}
                </Button>

                <Button
                onClick={handleResend}
                disabled={resendTimer > 0}
                variant="outlined"
                color="info"
                >
                {resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Resend Token'}
                </Button>

                <Button component={RouterLink} to="/login" variant="text">
                Back to Login
                </Button>
            </Stack>
            )}

            {step === 3 && (
            <Stack spacing={2}>
                <TextField
                required
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                InputProps={{
                    endAdornment: (
                    <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </InputAdornment>
                    ),
                }}
                />
                <TextField
                required
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                fullWidth
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                InputProps={{
                    endAdornment: (
                    <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </InputAdornment>
                    ),
                }}
                />

                <Button onClick={handleStep3} variant="contained" color="error" fullWidth disabled={loading}>
                {loading ? 'Resetting...' : 'Reset'}
                </Button>

                <Button component={RouterLink} to="/login" variant="text">
                Back to Login
                </Button>
            </Stack>
            )}
        </Stack>

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar}>
            <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
            </Alert>
        </Snackbar>
        </Box>
    );
}

export default ForgotPassword;
