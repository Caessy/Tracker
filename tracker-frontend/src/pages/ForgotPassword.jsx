import { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Alert, Snackbar, IconButton, Paper, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
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

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

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
            setSnackbar({ open: true, message: 'Token has been sent to your email, please check', severity: 'success'});
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
            setError('Please enter the token sent to your email')
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/verify-token', { resetToken: token, userId: userId });
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
        const timer = setInterval(() => {
            setResendTimer(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [resendTimer]);


    return (
        <Paper elevation={3} sx={{ maxWidth: 400, mx: 'auto', mt: 10, p: 4, borderRadius: 2 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>Forgot Password</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {step === 1 && (
                <>
                    <TextField
                        required
                        label="Username"
                        fullWidth
                        margin="normal"
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); setError(''); }}
                    />
                    <TextField
                        required
                        label="Email"
                        type="email"
                        fullWidth
                        margin="normal"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    />
                    <Button onClick={handleStep1} variant="contained" fullWidth disabled={loading}>
                        {loading ? 'Sending...' : 'Send Token'}
                    </Button>
                </>
            )}

            {step === 2 && (
                <>
                    <TextField
                        required
                        label="Token"
                        fullWidth
                        margin="normal"
                        value={token}
                        onChange={(e) => {setToken(e.target.value); setError(''); }}
                    />
                    <Button onClick={handleStep2} variant="contained" fullWidth disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify'}
                    </Button>
                    <Button
                        onClick={handleResend}
                        disabled={resendTimer > 0}
                        sx={{ mt: 1 }}
                    >
                        {resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Resend Token'}
                    </Button>
                </>
            )}

            {step === 3 && (
                <>
                    <TextField
                        required
                        label="New Password"
                        type={showPassword ? 'text' : 'password'}
                        fullWidth
                        margin="normal"
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
                        margin="normal"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                    <Button onClick={handleStep3} variant="contained" fullWidth disabled={loading}>
                        {loading ? 'Resetting...' : 'Reset'}
                    </Button>
                </>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
            
        </Paper>
    );
}

export default ForgotPassword;