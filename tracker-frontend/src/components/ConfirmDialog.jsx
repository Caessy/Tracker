import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useConfirmDialogStore } from "../store/useConfirmDialogStore";

export default function ConfirmDialog() {
    const { open, title, message, onConfirm, onCancel, close } = useConfirmDialogStore();

    return (
        <Dialog open={open} onClose={close}>
            {title && <DialogTitle>{title}</DialogTitle>}
            <DialogContent>
                <Typography>{message}</Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => { onCancel?.(); close(); }}>Cancel</Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={() => { onConfirm?.(); close(); }}
                >
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    )
}