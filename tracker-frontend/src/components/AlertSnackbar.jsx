import { Snackbar, Alert } from '@mui/material';
import { useAlertStore } from '../store/useAlertStore';

export default function AlertSnackbar() {
    const { alert, closeAlert } = useAlertStore();

    return (
        <Snackbar
            open={alert.open}
            autoHideDuration={4000}
            onClose={closeAlert}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
            <Alert onClose={closeAlert} severity={alert.severity} variant="filled">
                {alert.message}
            </Alert>
        </Snackbar>
    );
}