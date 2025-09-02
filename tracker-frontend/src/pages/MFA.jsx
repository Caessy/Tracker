import { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { verifyMFA, recoverMFA } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

function MFA() {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [openRecoverDialog, setOpenRecoverDialog] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState('');
    const [recoverError, setRecoverError] = useState('');
    const { setUser } = useAuthStore();
    const navigate = useNavigate();

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await verifyMFA(otp);
            localStorage.setItem('token', res.data.token);
            setUser(res.data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleRecover = async () => {
        setLoading(true);
        setRecoverError('');
        try {
            await recoverMFA(recoveryCode);
            localStorage.removeItem('token');
            alert('MFA disabled. Please login again.');
            navigate('/login');
        } catch (err) {
            setRecoverError(err.response?.data?.error?.message || 'Invalid recovery code');
        } finally {
            setLoading(false);
            setOpenRecoverDialog(false);
        }
    };


    return (
        <Box sx={{ maxWidth: 400, mx: 'auto', mt: 10 }}>
            <Typography variant="h5" gutterBottom>MFA Verification</Typography>

            {error && <Alert severity="error">{error}</Alert>}

            <form onSubmit={handleVerify}>
                <TextField
                    label="OTP"
                    type="number"
                    fullWidth
                    margin="normal"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.slice(0, 6)); if (error) setError(''); }}
                />
                <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading || otp.length < 6}
                >
                    {loading ? 'Verifying...' : 'Verify'}
                </Button>
            </form>

            <Link component="button" onClick={() => setOpenRecoverDialog(true)} sx={{ mt: 2 }}>
                Lost device? Use recovery code
            </Link>

            <Dialog open={openRecoverDialog} onClose={() => setOpenRecoverDialog(false)}>
                <DialogTitle>Recover MFA</DialogTitle>
                <DialogContent>
                    {recoverError && <Alert severity="error">{recoverError}</Alert>}
                    <TextField
                        label="Recovery Code"
                        fullWidth
                        margin="normal"
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenRecoverDialog(false)}>Cancel</Button>
                    <Button onClick={handleRecover} disabled={loading || !recoveryCode}>Recover</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default MFA;