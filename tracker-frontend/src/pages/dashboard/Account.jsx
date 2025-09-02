import { useState } from 'react';
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Alert, TextField } from '@mui/material';
import { enableMFA, disableMFA, enabledVerifyMFA, deleteAccount } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfirmDialogStore } from '../../store/useConfirmDialogStore';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '../../store/useAlertStore';
import { logoutCleanup } from '../../utils/logoutCleanup';

function Account() {
    const { user, setUser } = useAuthStore();
    const [openEnableDialog, setOpenEnableDialog] = useState(false);
    const [openDisableDialog, setOpenDisableDialog] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const showConfirm = useConfirmDialogStore(s => s.show);
    const closeConfirm = useConfirmDialogStore(s => s.close);
    const showAlert = useAlertStore(s => s.showAlert);
    const [deleting, setDeleting] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Step 1: 请求启用 MFA，拿到二维码和恢复码
    const handleEnable = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await enableMFA();
            setQrCode(res.data.qrCode);
            setRecoveryCode(res.data.recoveryCode);
            setOpenEnableDialog(true);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to enable MFA');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: 输入 OTP 验证
    const handleVerifyEnable = async () => {
        setVerifying(true);
        setError('');
        try {
            await enabledVerifyMFA(otp); // 调用 /enable/verify
            setUser({ ...user, mfa_enabled: true }); // 只有这里才更新 Store
            setOpenEnableDialog(false);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Invalid OTP');
        } finally {
            setVerifying(false);
        }
    };

    const handleDisable = async () => {
        setLoading(true);
        setError('');
        try {
            await disableMFA();
            setUser({ ...user, mfa_enabled: false });
            setOpenDisableDialog(false);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to disable MFA');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            setDeleting(true);
            await deleteAccount();
            logoutCleanup(queryClient);
            closeConfirm();
            navigate('/login', { replace: true });
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'failed to delete, please try again later.';
            showAlert(msg, 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5">Account Settings</Typography>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Box sx={{ mt: 3 }}>
                <Button
                    variant="contained"
                    onClick={handleEnable}
                    disabled={loading || user?.mfa_enabled}
                    sx={{ mr: 2 }}
                >
                    Enable MFA
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => setOpenDisableDialog(true)}
                    disabled={loading || !user?.mfa_enabled}
                >
                    Disable MFA
                </Button>
            </Box>

            <Box sx={{ mt: 3 }}>
                <Button
                    variant="contained"
                    color="error"
                    disabled={deleting}
                    onClick={() =>
                        showConfirm({
                            title: 'Delete Account',
                            message: 'Deleting your account will permanently erase all your data, continue?',
                            onConfirm: async () => { await handleDeleteAccount(); },
                        })
                    }
                    sx={{ mr: 2 }}
                >
                    Delete Account
                </Button>
            </Box>

            {/* Enable Dialog */}
            <Dialog open={openEnableDialog} onClose={() => setOpenEnableDialog(false)}>
                <DialogTitle>Enable MFA</DialogTitle>
                <DialogContent>
                    <Typography>Scan this QR code with your authenticator app:</Typography>
                    <img src={qrCode} alt="MFA QR Code" style={{ width: '100%' }} />
                    <Typography sx={{ mt: 2 }}>
                        Recovery Code (save securely): <strong>{recoveryCode}</strong>
                    </Typography>
                    <TextField
                        fullWidth
                        label="Enter OTP"
                        margin="normal"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEnableDialog(false)}>Cancel</Button>
                    <Button onClick={handleVerifyEnable} disabled={verifying || otp.length < 6} variant="contained">
                        Verify
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Disable Confirm Dialog */}
            <Dialog open={openDisableDialog} onClose={() => setOpenDisableDialog(false)}>
                <DialogTitle>Confirm Disable MFA</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to disable MFA? This reduces account security.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDisableDialog(false)}>Cancel</Button>
                    <Button onClick={handleDisable} color="error" disabled={loading}>
                        Disable
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Account;
