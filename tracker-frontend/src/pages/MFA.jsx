import { useState } from 'react';
import {
  Box, TextField, Button, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Link, Stack
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
    // 不再在这里放 Paper / 标题；交给 <AuthLayout title="MFA Verification"> 包裹
    <Box>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        <Box component="form" onSubmit={handleVerify}>
          <Stack spacing={2}>
            <TextField
              label="OTP"
              type="number"
              fullWidth
              value={otp}
              onChange={(e) => { setOtp(e.target.value.slice(0, 6)); if (error) setError(''); }}
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || otp.length < 6}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </Stack>
        </Box>

        <Link component="button" onClick={() => setOpenRecoverDialog(true)} sx={{ alignSelf: 'flex-start' }}>
          Lost device? Use recovery code
        </Link>

        <Button component={RouterLink} to="/login" variant="text" sx={{ alignSelf: 'flex-start' }}>
          Back to Login
        </Button>
      </Stack>

      <Dialog open={openRecoverDialog} onClose={() => setOpenRecoverDialog(false)}>
        <DialogTitle>Recover MFA</DialogTitle>
        <DialogContent>
          {recoverError && <Alert severity="error" sx={{ mt: 1 }}>{recoverError}</Alert>}
          <TextField
            label="Recovery Code"
            fullWidth
            margin="normal"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRecoverDialog(false)} variant="text">Cancel</Button>
          <Button onClick={handleRecover} disabled={loading || !recoveryCode} color="warning" variant="contained">
            Recover
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MFA;
