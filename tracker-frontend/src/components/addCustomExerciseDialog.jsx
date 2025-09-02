// src/components/exercise/AddCustomExerciseDialog.jsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createExercise } from '../services/api';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Stack, Button, MenuItem
} from '@mui/material';
import { useAlertStore } from '../store/useAlertStore';

export default function AddCustomExerciseDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const showAlert = useAlertStore(s => s.showAlert);

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [instruction, setInstruction] = useState('');
  const [note, setNote] = useState('');

  const MUSCLE_GROUPS = [
    'Chest',
    'Back',
    'Legs',
    'Shoulders',
    'Arms',
    'Core',
    'Full Body',
  ];

  const mutation = useMutation({
    mutationFn: async (payload) => (await createExercise(payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries(['exercises']);
      showAlert('Custom exercise created successfully!', 'success');
      resetForm();
      onClose();
    },
    onError: (err) => {
      console.error(err);
      showAlert(
        'error',
        err?.response?.data?.error?.message || 'Failed to create exercise'
      );
    }
  });

  const resetForm = () => {
    setName('');
    setMuscleGroup('');
    setInstruction('');
    setNote('');
  };

  const canSubmit = name.trim() !== '' && muscleGroup.trim() !== '';

  const handleSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate({
      name,
      muscle_group: muscleGroup,
      instruction,
      note
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Custom Exercise</DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          <TextField
            label="Exercise Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <TextField
            label="Muscle Group"
            value={muscleGroup}
            onChange={e => setMuscleGroup(e.target.value)}
            select
            required
          >
            {MUSCLE_GROUPS.map(group => (
              <MenuItem Key={group} value={group}>
                {group}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Instruction"
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            multiline
            minRows={2}
          />
          <TextField
            label="Note"
            value={note}
            onChange={e => setNote(e.target.value)}
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit || mutation.isPending}
        >
          Create Exercise
        </Button>
      </DialogActions>
    </Dialog>
  );
}
