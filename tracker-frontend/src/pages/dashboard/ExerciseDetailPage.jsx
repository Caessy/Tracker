import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getExerciseById, getExerciseHistory, updateExerciseInstruction, updateExerciseNote } from '../../services/api';
import { Box, Tabs, Tab, Typography, TextField, Button, Stack,
    CardContent, CircularProgress, Card, Grid, useTheme, useMediaQuery
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useAlertStore } from '../../store/useAlertStore';

export default function ExerciseDetailPage() {
    const theme = useTheme();
    const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
    const { id } = useParams();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState(0);
    const [instruction, setInstruction] = useState('');
    const [note, setNote] = useState('');
    const [name, setName] = useState('');
    const navigate = useNavigate();
    const showAlert = useAlertStore(s => s.showAlert);

    const { data: exercise, isLoading } = useQuery({
        queryKey: ['exercise', id],
        queryFn: async () => {
            const data = (await getExerciseById(id)).data;
            setInstruction(data.instruction || '');
            setNote(data.note || '');
            setName(data.name || '');
            return data;
        },
    });

    const updateInstructionMutation = useMutation({
        mutationFn: (newInstruction) => updateExerciseInstruction(id, newInstruction),
        onSuccess: () => {
            queryClient.invalidateQueries(['exercise', id]);
            showAlert('Instruction Updated!', 'success');
        }
    });

    const updateNoteMutation = useMutation({
        mutationFn: (newNote) => updateExerciseNote(id, newNote),
        onSuccess: () => {
            queryClient.invalidateQueries(['exercise', id]);
            showAlert('Note Updated!', 'success');
        }
    });

    // infinite scroll for history tab
    const limit = 10;
    const {
        data: historyPages,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['exerciseHistory', id],
        queryFn: async ({ pageParam = 1 }) => getExerciseHistory(id, pageParam, limit).then(res => res.data.history),
        getNextPageParam: (lastPage) => {
            return lastPage.meta.page < lastPage.meta.totalPages
                ? lastPage.meta.page + 1
                : undefined;
        },
        enabled: tab === 1 && !!exercise
    });


    // observer to detect scrolling to bottom
    const observerRef = useRef();
    const lastElementRef = useCallback(node => {
        if (isFetchingNextPage) return;
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasNextPage) {
                fetchNextPage();
            }
        });
        if (node) observerRef.current.observe(node);
    }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

    if (isLoading) return <Typography>Loading...</Typography>;
    
    if (!exercise) return <Typography>Exercise not Found</Typography>;

    return (
    <Box p={2}>
        {/* Header: Name + Back */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap">
        <Typography variant="h5" fontWeight={600}>{name}</Typography>
        <Button variant="outlined" onClick={() => navigate('/dashboard/Exercises')}>
            Back to Exercises Base
        </Button>
        </Stack>

        <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} sx={{ mb: 2 }}>
        <Tab label="Instruction & Note" />
        <Tab label="History" />
        <Tab label="Growth" />
        </Tabs>

        {/* Instruction & Note Tab */}
        {tab === 0 && (
        <Box mt={2}>
            {isSmUp ? (
            <Stack direction="row" gap={2}>
                <Stack flex={1} spacing={2}>
                <TextField
                    label="Instruction"
                    value={instruction}
                    onChange={e => setInstruction(e.target.value)}
                    multiline
                    minRows={3}
                    disabled={exercise.user_id === null}
                />
                <Button
                    variant="contained"
                    onClick={() => updateInstructionMutation.mutate(instruction)}
                    disabled={exercise.user_id === null || updateInstructionMutation.isLoading}
                >
                    Save Instruction
                </Button>
                </Stack>
                <Stack flex={1} spacing={2}>
                <TextField
                    label="Note"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    multiline
                    minRows={3}
                />
                <Button
                    variant="contained"
                    onClick={() => updateNoteMutation.mutate(note)}
                    disabled={updateNoteMutation.isLoading}
                >
                    Save Note
                </Button>
                </Stack>
            </Stack>
            ) : (
            <Stack spacing={2}>
                <TextField
                label="Instruction"
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                multiline
                minRows={3}
                disabled={exercise.user_id === null}
                />
                <Button
                variant="contained"
                onClick={() => updateInstructionMutation.mutate(instruction)}
                disabled={exercise.user_id === null || updateInstructionMutation.isLoading}
                >
                Save Instruction
                </Button>
                <TextField
                label="Note"
                value={note}
                onChange={e => setNote(e.target.value)}
                multiline
                minRows={2}
                />
                <Button
                variant="contained"
                onClick={() => updateNoteMutation.mutate(note)}
                disabled={updateNoteMutation.isLoading}
                >
                Save Note
                </Button>
            </Stack>
            )}
        </Box>
        )}

        {/* History Tab */}
        {tab === 1 && (
        <Box mt={2}>
            <Grid container spacing={2}>
            {historyPages?.pages.map((page, pageIndex) =>
                page.data.map((w, index) => {
                const isLast = pageIndex === historyPages.pages.length - 1 && index === page.data.length - 1;
                return (
                    <Grid item key={w.workout_id} xs={12} sm={6} ref={isLast ? lastElementRef : null}>
                    <Card>
                        <CardContent>
                        <Typography variant="h6" fontWeight={600} mb={0.5}>
                            {w.routine_name || 'Custom Workout'}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" mb={1}>
                            {new Date(w.date).toLocaleString()}
                        </Typography>
                        <Stack spacing={0.5}>
                            {JSON.parse(w.sets).map(s => (
                            <Typography key={s.set_order} variant="body1">
                                Set {s.set_order}: {s.reps} reps   x   {s.weight} {s.weight_unit} rest {s.rest_sec}s
                            </Typography>
                            ))}
                        </Stack>
                        <Typography mt={1} variant="body1" fontWeight={500}>
                            Volume: {w.volume}
                        </Typography>
                        </CardContent>
                    </Card>
                    </Grid>
                );
                })
            )}
            </Grid>
            {isFetchingNextPage && <CircularProgress sx={{ mt: 2 }} />}
            {!hasNextPage && <Typography mt={2}>All history loaded</Typography>}
        </Box>
        )}

        {/* Growth Tab */}
        {tab === 2 && (
        <Box mt={2}>
            <Typography variant="h6" mb={2}>Growth Charts for your last 10 workouts</Typography>

            {['Total Volume', 'Max Weight', 'Max Reps'].map((title, idx) => {
            const chartData = exercise.history.data.map(w => {
                const sets = JSON.parse(w.sets);
                return {
                date: new Date(w.date).toLocaleDateString(),
                value:
                    title === 'Total Volume' ? w.volume :
                    title === 'Max Weight' ? Math.max(...sets.map(s => s.weight || 0)) :
                    Math.max(...sets.map(s => s.reps || 0))
                };
            });
            const stroke = title === 'Total Volume' ? '#8884d8' : title === 'Max Weight' ? '#82ca9d' : '#ffc658';

            return (
                <Box key={title} mt={3}>
                <Typography variant="subtitle1">{title}</Typography>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: title, angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke={stroke} />
                    </LineChart>
                </ResponsiveContainer>
                </Box>
            );
            })}
        </Box>
        )}
    </Box>
    );
}