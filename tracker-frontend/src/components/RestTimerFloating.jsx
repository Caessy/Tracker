import React, { useEffect, useState, useRef } from 'react';
import Draggable from 'react-draggable';
import { useSessionStore } from '../store/useSessionStore';
import { Paper, Stack, Typography, Button, useTheme, useMediaQuery } from '@mui/material';

function formatDuration(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export default function RestTimerFloating() {
    const restTimer = useSessionStore((s) => s.restTimer);
    const stopRest = useSessionStore((s) => s.stopRest);
    const addRestSeconds = useSessionStore((s) => s.addRestSeconds);
    const updateSet = useSessionStore((s) => s.updateSet);

    const nodeRef = useRef(null);
    const [displaySeconds, setDisplaySeconds] = useState(restTimer.seconds);

    const theme = useTheme();
    const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

    useEffect(() => {
        setDisplaySeconds(restTimer.seconds);
    }, [restTimer.seconds]);

    const handleEnd = () => {
        if (restTimer.targetSet) {
            const { exercise_type_id, setIndex } = restTimer.targetSet;
            const { startTimestamp } = restTimer;
            const actualRest = Math.round((Date.now() - startTimestamp) / 1000);
            updateSet(exercise_type_id, setIndex, 'rest_sec', actualRest);
        }
        stopRest();
    };

    useEffect(() => {
        if (restTimer.isActive && restTimer.seconds <= 0) {
            handleEnd();
        }
    }, [restTimer.seconds]);

    if (!restTimer.isActive) return null;

    return (
        <Draggable nodeRef={nodeRef}>
            <Paper
                ref={nodeRef}
                elevation={10}
                sx={{
                    position: 'fixed',
                    bottom: 100,
                    right: 30,
                    p: isSmUp ? 2 : 1,
                    borderRadius: 4,
                    width: isSmUp ? 180 : 140,
                    cursor: 'move',
                    zIndex: (theme) => theme.zIndex.modal + 2, // make the timer at the top most layer always
                }}
            >
                <Stack spacing={1} alignItems="center">
                    <Typography variant={isSmUp ? 'subtitle2' : 'caption'}>Rest Timer</Typography>
                    <Typography variant={isSmUp ? 'h4' : 'h6'}>{formatDuration(displaySeconds)}</Typography>
                    <Stack direction="row" spacing={1}>
                        <Button
                            size={isSmUp ? 'small' : 'extra-small'}
                            variant="contained"
                            onClick={() => addRestSeconds(10)}
                        >
                            +10s
                        </Button>
                        <Button
                            size={isSmUp ? 'small' : 'extra-small'}
                            variant="contained"
                            onClick={() => addRestSeconds(-10)}
                        >
                            -10s
                        </Button>
                    </Stack>
                    <Button
                        size={isSmUp ? 'small' : 'extra-small'}
                        variant="outlined"
                        color="secondary"
                        onClick={handleEnd}
                    >
                        End Rest
                    </Button>
                </Stack>
            </Paper>
        </Draggable>
    );
}