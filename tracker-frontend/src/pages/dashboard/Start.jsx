import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoutines, deleteRoutine, getRoutineById } from '../../services/api';
import { useSessionStore } from '../../store/useSessionStore';
import { useAlertStore } from '../../store/useAlertStore';
import { useConfirmDialogStore } from '../../store/useConfirmDialogStore';
import { Grid, Card, CardContent, CardActions, Typography, useTheme, useMediaQuery,
        Button, Stack, IconButton, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import CreateRoutineDialog from '../../components/CreateRoutineDialog';

export default function Start() {
    const [createRoutineOpen, setCreateRoutineOpen] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const startCustomSession = useSessionStore(s => s.startCustomSession);
    const startRoutineSession = useSessionStore(s => s.startRoutineSession);
    const active = useSessionStore(s => s.active);

    const showAlert = useAlertStore(s => s.showAlert);
    const showConfirm = useConfirmDialogStore(s => s.show);

    const theme = useTheme();
    const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

    const { data, isLoading } = useQuery({ queryKey: ['routine'], queryFn: async () => (await getRoutines()).data });

    const del = useMutation({
        mutationFn: (id) => deleteRoutine(id),

        onMutate: async (id) => {
            showAlert("Deleting routine...", 'info');
            await queryClient.cancelQueries({ queryKey: ['routine'] });
            const previous = queryClient.getQueryData(['routine']);
            queryClient.setQueryData(['routine'], (old) =>
                old ? old.filter(r => r.id !== id) : []
            );
            return { previous };
        },

        onError: (err, id, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['routine'], context.previous);
            }
            showAlert('Failed to delete routine', 'error');
        },

        onSuccess: () => {
            showAlert('Routine Deleted!', 'success');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['routine'] });
        }

    });

    const routines = data || [];
    const systemRoutines = routines.filter(r => r.type === 'system');
    const customRoutines = routines.filter(r => r.type === 'custom');

    const handleStartCustom = () => {
        if (active) {
            showAlert("You already have an active session. Please cancel it first.", "warning");
            return;
        }
        startCustomSession();
        navigate('/dashboard/workout/quick');
    };

    const handleStartRoutine = async (r) => {
        if (active) {
            showAlert("You already have an active session. Please cancel it first.", "warning");
            return;
        }
        if (!r?.id) return;

        try {
            const res = await getRoutineById(r.id);
            const routineData = res.data;
            //console.log('routineData', routineData);

            if (routineData) {
                startRoutineSession(routineData);
                navigate('/dashboard/workout/quick');
            }
        } catch (err) {
            console.error(err);
            showAlert("Failed to load routine data", "error");
        }
    };


    
    return (
        <Stack spacing={4} sx={{ width: '100% '}}>
            {/* Hero Section */}
        <Card
            sx={{
                width: '100%',
                p: { xs: 2, sm: 4 },
                bgcolor: 'primary.main',
                color: 'white',
                borderRadius: 3,
            }}
            >
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
            >
                {/* 左侧文字 */}
                <Stack spacing={1}>
                <Typography variant="h4">Ready to Workout?</Typography>
                <Typography variant="body1" sx={{ opacity: 0.85 }}>
                    Start a quick custom workout or explore exercises to build your routine
                </Typography>
                </Stack>

                {/* 右侧按钮 */}
                <Stack direction="row" spacing={2} sx={{ mt: { xs: 2, sm: 0 } }}>
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleStartCustom}
                        sx={{
                        width: 100,
                        height: 100,
                        borderRadius: '50%', // 圆形
                        fontSize: '1.2rem',
                        boxShadow: 4,
                        }}
                    >
                        Start
                    </Button>
                </Stack>
            </Stack>
        </Card>

        {/* Routines Section */}
        <Stack spacing={2}>
        <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
        >
            <Typography variant="h5">Your Routines</Typography>
            <Button variant="contained" onClick={() => setCreateRoutineOpen(true)}>
                + Create Routine
            </Button>
        </Stack>

        {/* System Routines */}
        <Accordion defaultExpanded={isSmUp} borderRadius={1}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">System Routines</Typography>
            </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={2}>
                        {(isLoading ? Array.from({ length: 4 }) : systemRoutines).map((r, i) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={r?.id || i}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="subtitle1">{r?.name || '...'}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {r?.description || ''}
                                    </Typography>
                                    </CardContent>
                                    <CardActions>
                                        <Button size="small" onClick={() => handleStartRoutine(r)}>
                                            Start
                                        </Button>
                                    </CardActions>
                                </Card>
                        </Grid>
                    ))}
                    </Grid>
                </AccordionDetails>
        </Accordion>

        {/* Custom Routines */}
        <Accordion defaultExpanded={isSmUp}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Custom Routines</Typography>
            </AccordionSummary>
            <AccordionDetails>
            <Grid container spacing={2}>
                {(isLoading ? Array.from({ length: 4 }) : customRoutines).map((r, i) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={r?.id || i}>
                    <Card
                    sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                    >
                    <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1">{r?.name || '...'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                        {r?.description || ''}
                        </Typography>
                    </CardContent>
                    <CardActions>
                        <Button size="small" onClick={() => handleStartRoutine(r)}>
                        Start
                        </Button>
                        <IconButton
                        size="small"
                        onClick={() =>
                            showConfirm({
                            title: 'Delete Custom Routine',
                            message:
                                'Deleting this routine will make all workouts using this routine custom workouts. Continue?',
                            onConfirm: () => del.mutate(r.id),
                            })
                        }
                        disabled={del.isPending}
                        >
                        <DeleteIcon fontSize="small" />
                        </IconButton>
                    </CardActions>
                    </Card>
                </Grid>
                ))}
            </Grid>
            </AccordionDetails>
        </Accordion>
        </Stack>

        {/* Create Routine Dialog */}
        <CreateRoutineDialog
        open={createRoutineOpen}
        onClose={() => setCreateRoutineOpen(false)}
        />
    </Stack>
    );

}