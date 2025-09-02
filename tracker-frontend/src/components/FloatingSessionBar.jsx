import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/useSessionStore';
import { useConfirmDialogStore } from '../store/useConfirmDialogStore';
import { Paper, Stack, Button, Typography, useMediaQuery, useTheme } from '@mui/material';

function formatDuration(sec) {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

export default function FloatingSessionBar() {
    const navigate = useNavigate();
    const active = useSessionStore(s => s.active);
    const type = useSessionStore(s => s.type);
    const routineId = useSessionStore(s => s.routineId);
    const routineName = useSessionStore(s => s.routineName);
    const durationSec = useSessionStore(s => s.durationSec);
    const exercisesCount = useSessionStore(s => s.exercises.length);
    const location = useLocation();
    const stopAndReset = useSessionStore(s => s.stopAndReset);

    const theme = useTheme();
    const isSumUp = useMediaQuery(theme.breakpoints.up('sm')); // sm 及以上桌面

    // rest timer
    const restTimer = useSessionStore(s => s.restTimer);

    const showConfirm = useConfirmDialogStore(s => s.show);

    const label = useMemo(
        () => (type === 'routine' ? `${routineName}` : 'Custom Workout'),
        [type, routineName]
    );

    if (!active) return null;

    if (location.pathname.endsWith("/quick")) return null;

    return (
        <Paper
            elevation={6}
            sx={{
                position: 'fixed',
                left: isSumUp ? '50%' : 16,
                transform: isSumUp ? 'translateX(-50%)' : 'none',
                width: isSumUp ? 600 : 'calc(100% - 32px)',
                bottom: 16,
                p: isSumUp ? 2 : 1.5,
                borderRadius: 3,
            }}
        >
            <Stack direction="row"
                alignItems="center"
                justifyContent="space-between"
                gap={2}
                flexWrap="wrap"
            >
                {isSumUp && (
                    <Stack>
                        <Typography variant="h6">{label}</Typography>
                        <Typography variant="body2">
                            {formatDuration(durationSec)} · {exercisesCount} exercises
                        </Typography>

                        {restTimer.isActive && (
                            <Typography variant="body2" color="secondary">
                                Rest {restTimer.seconds}s left
                            </Typography>
                        )}
                    </Stack>
                )}

                <Button
                    variant="contained"
                    onClick={() =>
                        navigate(
                            '/dashboard/workout/quick'
                        )
                    }
                >
                    Return to Session
                </Button>

                <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                        showConfirm({
                            title: "Cancel Session",
                            message: "Are you sure to cancel the current unsaved session?",
                            onConfirm: () => stopAndReset()
                        })
                    }}
                >
                    Cancel Session
                </Button>
            </Stack>
        </Paper>
    );
}