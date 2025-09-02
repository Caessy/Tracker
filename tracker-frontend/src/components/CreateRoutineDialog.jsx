import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRoutine } from '../services/api';
import ExercisePickerDialog from './ExercisePickerDialog';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Stack, Button, IconButton, Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {useAlertStore} from '../store/useAlertStore';

export default function CreateRoutineDialog({ open, onClose, initialExercises = [] }) {
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
    const [selectedExercises, setSelectedExercises] = useState([]);
    const showAlert = useAlertStore(s => s.showAlert);

    useEffect(() => {
        if (open && initialExercises?.length) {
            setSelectedExercises(
                initialExercises.map(ex => ({
                    exercise_type_id: ex.exercise_type_id,
                    name: ex.exercise_name || ex.name || ''
                }))
            );
        }
    }, [open]);


    const createMutation = useMutation({
        mutationFn: async (payload) => (await createRoutine(payload)).data,
        onSuccess: () => {
            queryClient.invalidateQueries(['routine']);
            showAlert('Routine Created Successfully!', 'success');
            onClose();
            setName('');
            setDescription('');
            setSelectedExercises([]);
        },
        onError: (err) => {
            console.error(err);
            showAlert(err?.response?.data?.error?.message || 'Failed to create routine', 'error');
        }
    });

    const handleAddExercises = (exList) => {
        setSelectedExercises(prev => {
            const existingIds = new Set(prev.map(e => e.exercise_type_id));
            const newEx = exList
                .filter(e => !existingIds.has(e.id))
                .map(e => ({ exercise_type_id: e.id, name: e.name }));
            return [...prev, ...newEx];
        });
    };

    const handleRemoveExercise = (id) => {
        setSelectedExercises(prev => prev.filter(e => e.exercise_type_id !== id));
    };

    const canSubmit = name.trim() !== '' && selectedExercises.length > 0;

    const handleSubmit = () => {
        if (!canSubmit) return;
        const payload = {
            name,
            description,
            exercises: selectedExercises.map(e => ({ exercise_type_id: e.exercise_type_id }))
        };
        createMutation.mutate(payload);
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        setSelectedExercises([]);
        onClose();
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogTitle>Create New Routine</DialogTitle>
                <DialogContent dividers>
                    <Stack gap={2}>
                        <TextField
                            label="Routine Name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                        <TextField
                            label="Description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            multiline
                            minRows={2}
                        />
                        <Button variant="outlined" onClick={() => setExercisePickerOpen(true)}>
                            Add Exercises
                        </Button>

                        {selectedExercises.length > 0 && (
                            <Stack gap={1}>
                                {selectedExercises.map(ex => (
                                    <Stack
                                        key={ex.exercise_type_id}
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                    >
                                        <Typography>{ex.name}</Typography>
                                        <IconButton onClick={() => handleRemoveExercise(ex.exercise_type_id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || createMutation.isPending}>
                        Create Routine
                    </Button>
                </DialogActions>
            </Dialog>

            <ExercisePickerDialog
                open={exercisePickerOpen}
                onClose={() => setExercisePickerOpen(false)}
                onConfirm={handleAddExercises}
            />
        </>
    );
}
