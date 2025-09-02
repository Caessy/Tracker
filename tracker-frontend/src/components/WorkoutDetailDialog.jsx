import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, TextField, Stack, Card, CardContent, Divider, IconButton, MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { getWorkoutById, updateWorkout, detachRoutine, getRoutineById, getWorkoutComments, deleteWorkout } from '../services/api';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import ExercisePickerDialog from './ExercisePickerDialog';
import CreateRoutineDialog from './CreateRoutineDialog';
import { useSessionStore } from '../store/useSessionStore';
import { useAlertStore } from '../store/useAlertStore';
import { useConfirmDialogStore } from '../store/useConfirmDialogStore';

const CommentsDialog = ({ open, workoutId, onClose }) => {
    const { data: commentsData } = useQuery({
        queryKey: ['workoutComments', workoutId],
        queryFn: () => getWorkoutComments(workoutId),
        enabled: open,
    });

    const comments = commentsData?.data?.comments || [];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Comments</DialogTitle>
            <DialogContent>
                <Stack spacing={2}>
                    {comments.length > 0 ? (
                        comments.map((c) => (
                            <Card key={c.id} variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2">{c.instructor_name}</Typography>
                                    <Typography variant="body2">{c.comment_text}</Typography>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Typography>No comments yet.</Typography>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

const WorkoutDetailDialog = ({ open, workoutId, onClose, onRoutineCreate, onCustomSession }) => {
    const [workout, setWorkout] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formState, setFormState] = useState({ date: '', duration_min: '', note: '' });
    const [pickerOpen, setPickerOpen] = useState(false);
    const [createRoutineOpen, setCreateRoutineOpen] = useState(false);
    const navigate = useNavigate();
    const [commentsOpen, setCommentsOpen] = useState(false);

    const startCustomSession = useSessionStore(s => s.startCustomSession);
    const startRoutineSession = useSessionStore(s => s.startRoutineSession);
    const active = useSessionStore(s => s.active);

    const showAlert = useAlertStore(s => s.showAlert);
    const showConfirm = useConfirmDialogStore(s => s.show);

    useEffect(() => {
        if (open && workoutId) {
        getWorkoutById(workoutId).then(res => {
            const w = res.data.workout;
            setWorkout(w);
            setFormState({
            date: dayjs(w.date).utc().isValid() ? dayjs(w.date).utc().format('YYYY-MM-DD') : '',
            duration_min: w.duration_min ?? '',
            note: w.note || '',
            });
        });
        }
    }, [open, workoutId]);

    const handleChange = (field, value) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const addSet = (exercise_type_id) => {
        setWorkout(prev => ({
        ...prev,
        exercises: prev.exercises.map(ex => ex.exercise_type_id === exercise_type_id
            ? { ...ex, sets: [...ex.sets, { reps: '', weight: '', weight_unit: 'kg', rest_sec: '' }] }
            : ex
        )
        }));
    };

    const removeSet = (exercise_type_id, idx) => {
        setWorkout(prev => ({
        ...prev,
        exercises: prev.exercises.map(ex => ex.exercise_type_id === exercise_type_id
            ? { ...ex, sets: ex.sets.filter((_, i) => i !== idx) }
            : ex
        )
        }));
    };

    const updateSet = (exercise_type_id, idx, field, value) => {
        setWorkout(prev => ({
        ...prev,
        exercises: prev.exercises.map(ex => ex.exercise_type_id === exercise_type_id
            ? {
                ...ex,
                sets: ex.sets.map((s, i) => i === idx ? { ...s, [field]: value } : s)
            }
            : ex
        )
        }));
    };

    const removeExercise = (exercise_type_id) => {
        setWorkout(prev => ({
        ...prev,
        exercises: prev.exercises.filter(ex => ex.exercise_type_id !== exercise_type_id)
        }));
    };

    const addExercises = (list) => {
        setWorkout(prev => ({
        ...prev,
        exercises: [
            ...prev.exercises,
            ...list.map(l => ({
            exercise_type_id: l.id,
            exercise_name: l.name,
            sets: [{ reps: '', weight: '', weight_unit: 'kg', rest_sec: '' }]
            }))
        ]
        }));
        setPickerOpen(false);
    };

    const detachRoutineHandler = async () => {
        await detachRoutine(workoutId);
        setWorkout(prev => ({ ...prev, routine_id: null }));
    };

    const handleSave = async () => {
        const hasEmptySet = workout.exercises.some(ex =>
            ex.sets.some(s => s.reps === '' || s.weight === '')
        );
        if (hasEmptySet) {
            alert('There are empty sets. Please fill in reps and weight before saving.');
            return;
        }

        const payload = {
            date: dayjs(formState.date).isValid() ? dayjs(formState.date).toISOString() : null,
            duration_min: Number(formState.duration_min) || 0,
            note: formState.note ?? '',
            exercises: workout.exercises.map(ex => ({
                exercise_type_id: ex.exercise_type_id,
                sets: ex.sets.map(s => ({
                    reps: Number(s.reps),
                    weight: Number(s.weight),
                    weight_unit: s.weight_unit || 'kg',
                    rest_sec: s.rest_sec || 0,
                })),
            })),
        };

        await updateWorkout(workoutId, payload);
        setWorkout(prev => ({
            ...prev,
            ...payload,
            exercises: prev.exercises.map((ex, idx) => ({
                ...payload.exercises[idx],
                exercise_name: ex.exercise_name
            }))
        }));
        setEditMode(false);
    };

    const handleDeleteWorkout = () => {
        showConfirm({
            title: 'Delete Workout',
            message: 'Are you sure you want to delete this workout?',
            onConfirm: async () => {
                try {
                    await deleteWorkout(workoutId);
                    showAlert('Workout deleted', 'success');
                    onClose();
                } catch (err) {
                    console.error(err);
                    showAlert('Failed to delete workout', 'error');
                }
            }
        });
    };

    const handleStartCustomSession = () => {
        if (active) {
            showAlert("You already have an active session. Please cancel it first.", "warning");
            return;
        }
        if (!workout?.exercises?.length) {
            showAlert('This workout has no exercises!');
            return;
        }
        const initialExercises = workout.exercises.map(ex => ({
            exercise_type_id: ex.exercise_type_id,
            exercise_name: ex.exercise_name,
            sets: ex.sets.length ? ex.sets : [{ reps: '', weight: '', weight_unit: 'kg', rest_sec: '' }]
        }));
        startCustomSession(initialExercises);
        onClose();
        navigate('/dashboard/workout/quick')
    };

    const handleStartRoutine = async (routineId) => {
            if (active) {
                showAlert("You already have an active session. Please cancel it first.", "warning");
                return;
            }
            try {
                const res = await getRoutineById(routineId);
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
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>{workout?.name || 'Workout Detail'}</DialogTitle>
        <DialogContent dividers>
            {/* Info fields */}
            <TextField
                label="Date"
                type="date"
                fullWidth
                margin="normal"
                value={formState.date}
                onChange={e => handleChange('date', e.target.value)}
                InputProps={{ readOnly: !editMode }}
                InputLabelProps={{ shrink: true }}
            />
            <TextField
                label="Duration (min)"
                type="number"
                fullWidth
                margin="normal"
                value={formState.duration_min}
                onChange={e => handleChange('duration_min', e.target.value)}
                InputProps={{ readOnly: !editMode }}
            />
            <TextField
                label="Note"
                fullWidth
                margin="normal"
                multiline
                minRows={2}
                value={formState.note}
                onChange={e => handleChange('note', e.target.value)}
                InputProps={{ readOnly: !editMode }}
            />

            {/* Exercises */}
            <Typography variant="h6" mt={2}>Exercises</Typography>
            <Stack gap={2} mt={1}>
            {workout?.exercises?.map((ex, idx) => (
                <Card key={idx} variant="outlined">
                <CardContent>
                    <Stack gap={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1">{ex.exercise_name}</Typography>
                        <Stack direction="row" gap={1}>
                        {!workout?.routine_id && editMode && (
                            <IconButton onClick={() => removeExercise(ex.exercise_type_id)}>
                                <DeleteIcon />
                            </IconButton>
                        )}
                        </Stack>
                    </Stack>

                    {ex.sets.map((s, i) => (
                        <Stack key={i} direction={{ xs: 'row', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} flexWrap="wrap">
                        <TextField
                            type="number"
                            label="Reps"
                            size="small"
                            value={s.reps}
                            disabled={!editMode}
                            onChange={e => updateSet(ex.exercise_type_id, i, 'reps', e.target.value)}
                            sx={{ width: { xs: '60px', sm: 120 } }}
                        />
                        <TextField
                            type="number"
                            label="Weight"
                            size="small"
                            value={s.weight}
                            disabled={!editMode}
                            onChange={e => updateSet(ex.exercise_type_id, i, 'weight', e.target.value)}
                            sx={{ width: { xs: '60px', sm: 120 } }}
                        />
                        <TextField
                            select
                            label="Unit"
                            size="small"
                            value={s.weight_unit ?? 'kg'}
                            disabled={!editMode}
                            onChange={e => updateSet(ex.exercise_type_id, i, 'weight_unit', e.target.value)}
                            sx={{ width: { xs: '60px', sm: 120 } }}
                        >
                            <MenuItem value="kg">kg</MenuItem>
                            <MenuItem value="lb">lb</MenuItem>
                        </TextField>
                        <TextField
                            type="number"
                            label="Rest (sec)"
                            size="small"
                            value={s.rest_sec}
                            disabled={!editMode}
                            onChange={e => updateSet(ex.exercise_type_id, i, 'rest_sec', e.target.value)}
                            sx={{ width: { xs: '60px', sm: 160 } }}
                        />
                        {editMode && (
                            <IconButton onClick={() => removeSet(ex.exercise_type_id, i)}>
                            <DeleteIcon />
                            </IconButton>
                        )}
                        </Stack>
                    ))}

                    {editMode && (
                        <Button startIcon={<AddIcon />} size="small" onClick={() => addSet(ex.exercise_type_id)}>
                        Add Set
                        </Button>
                    )}
                    </Stack>
                </CardContent>
                </Card>
            ))}
            </Stack>

            {/* Add Exercise button (只一个按钮) */}
            {editMode && !workout?.routine_id && (
            <Button startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => setPickerOpen(true)}>
                Add Exercises
            </Button>
            )}

            {/* Routine detach */}
            {workout?.routine_id && editMode && (
            <Button variant="outlined" color="warning" onClick={detachRoutineHandler} sx={{ mt: 2 }}>
                Detach from Routine (Switch to Custom)
            </Button>
            )}

            {/* Exercise Picker */}
            <ExercisePickerDialog
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onConfirm={addExercises}
            />
        </DialogContent>

        {/* Actions */}
        <DialogActions>
            {!editMode && (
                <>
                    <Button onClick={() => setEditMode(true)} variant="outlined">Edit</Button>
                    <Button onClick={() => setCreateRoutineOpen(true)} variant="contained">Create Routine</Button>
                    {workout?.routine_id ? (
                        <Button
                            onClick={() => handleStartRoutine(workout.routine_id)}
                            variant="contained"
                            color='warning'
                        >
                            Start Routine Session
                        </Button>
                    ) : (
                        <Button
                            onClick={handleStartCustomSession}
                            variant="contained"
                            color='success'
                        >
                            Start Custom Session
                        </Button>
                    )}
                    <Button onClick={() => setCommentsOpen(true)}>View Comments</Button>
                    <Button color="error" onClick={handleDeleteWorkout}>Delete Workout</Button>
                </>
            )}
            {editMode && (
            <>
                <Button onClick={() => setEditMode(false)}>Cancel</Button>
                <Button onClick={handleSave} variant="contained">Save</Button>
            </>
            )}
            <Button onClick={onClose}>Close</Button>
        </DialogActions>

        <CommentsDialog open={commentsOpen} workoutId={workoutId} onClose={() => setCommentsOpen(false)} />

        <CreateRoutineDialog
            open={createRoutineOpen}
            onClose={() => setCreateRoutineOpen(false)}
            initialExercises={workout?.exercises || []}
        />
        </Dialog>

        
        
    );
};

export default WorkoutDetailDialog;
