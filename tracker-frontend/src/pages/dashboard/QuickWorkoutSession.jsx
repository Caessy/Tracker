import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createWorkout, createWorkoutWithRoutine } from '../../services/api';
import { useSessionStore } from '../../store/useSessionStore';
import { useAlertStore } from '../../store/useAlertStore';
import { useConfirmDialogStore } from '../../store/useConfirmDialogStore';
import ExercisePickerDialog from '../../components/ExercisePickerDialog';
import {
  Stack, Typography, Button, Card, CardContent, IconButton,
  TextField, MenuItem, Divider, Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';

function format(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function QuickWorkoutSession() {
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const active = useSessionStore(s => s.active);
  const type = useSessionStore(s => s.type);
  const routineName = useSessionStore(s => s.routineName);
  const routineId = useSessionStore(s => s.routineId);
  const durationSec = useSessionStore(s => s.durationSec);
  const isPaused = useSessionStore(s => s.isPaused);
  const exercises = useSessionStore(s => s.exercises);
  // store hooks
  const pauseTimer = useSessionStore(s => s.pauseTimer);
  const resumeTimer = useSessionStore(s => s.resumeTimer);
  const addExercises = useSessionStore(s => s.addExercises);
  const addSet = useSessionStore(s => s.addSet);
  const removeExercise = useSessionStore(s => s.removeExercise);
  const removeSet = useSessionStore(s => s.removeSet);
  const updateSet = useSessionStore(s => s.updateSet);
  const stopAndReset = useSessionStore(s => s.stopAndReset);
  const completeSet = useSessionStore(s => s.completeSet);

  const convertToCustom = useSessionStore(s => s.convertToCustom);
  const showConfirm = useConfirmDialogStore(s => s.show);
  const showAlert = useAlertStore(s => s.showAlert);

  const saveMutation = useMutation({
    mutationFn: async(payload) => {
      if (type === 'routine') return (await createWorkoutWithRoutine(payload)).data;
      if (payload.routineName) return (await createWorkoutWithRoutine(payload)).data;
      return (await createWorkout(payload)).data;
    },
    onSuccess: () => {
      showAlert('Workout uploaded successfully!', 'success');
      stopAndReset();
      navigate('/dashboard/start');
    }
  });

  if (!active) {
    return (
      <Stack gap={2}>
        <Typography variant="h6">No active session</Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard/start')}>Go to Start</Button>
      </Stack>
    );
  }

  const onConfirmAdd = (list) => addExercises(list);

  const payloadBase = {
    date: new Date().toISOString(),
    duration_min: Math.max(1, Math.round(durationSec / 60)),
    note: note || '',
    exercises: exercises.map(e => ({
      exercise_type_id: e.exercise_type_id,
      sets: e.sets
        .filter(s => s.completed && Number(s.reps) > 0)
        .map(s => ({
          reps: Number(s.reps),
          weight: Number(s.weight || 0),
          weight_unit: s.weight_unit || 'kg',
          rest_sec: s.rest_sec != null ? Number(s.rest_sec) : undefined,
      }))
    }))
    .filter(e => e.sets.length > 0),
    ...(type === 'routine' ? { routine_id: routineId } : {})
  };

  const canSave = exercises.length > 0 && exercises.some(e => e.sets.some(s => s.completed));

  const completeSetHandler = (exercise_type_id, setIndex) => {
    const { rest_sec } = exercises.find(e => e.exercise_type_id === exercise_type_id).sets[setIndex];
    completeSet(exercise_type_id, setIndex, rest_sec);
  }

  return (
    <Stack gap={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center">
        <Typography variant="h5">
          {type === 'routine' ? `Routine · ${routineName}` : 'Custom Workout'}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
            variant="contained"
            size="large"
            onClick={() => (isPaused ? resumeTimer() : pauseTimer())}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Typography variant="h6">{format(durationSec)}</Typography>
        </Stack>
      </Stack>

  {/* Note + Exercises Card */}
    <Card>
      <CardContent>
        <Stack gap={2}>
          <TextField
            label="How do you feel today? Note your session."
            multiline
            minRows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Exercises</Typography>
            {type !== 'routine' && (
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={() => setPickerOpen(true)}
              >
                Add Exercises
              </Button>
            )}
          </Stack>

        {exercises.map((ex, eIdx) => (
          <Card key={`exercise-${ex.exercise_type_id}-${eIdx}`} variant="outlined">
            <CardContent>
              <Stack gap={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1">{ex.name}</Typography>
                  <Stack direction="row" spacing={1}>
                    {/* 新设计的 See Exercise Detail 按钮 */}
                    <Button
                      startIcon={<VisibilityIcon />}
                      onClick={() => navigate(`../exercise/${ex.exercise_type_id}`)}
                      sx={{
                        bgcolor: '#39FF14', // 荧光绿
                        color: '#000',
                        fontWeight: 'bold',
                        '&:hover': { bgcolor: '#32CD32' },
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                      }}
                    >
                      Details
                    </Button>
                    {type !== 'routine' && (
                      <IconButton onClick={() => removeExercise(ex.exercise_type_id)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Stack>
                </Stack>

                {ex.sets.map((s, idx) => (
                  <Stack
                    key={`set-${ex.exercise_type_id}-${idx}`}
                    direction="row"
                    gap={1}
                    alignItems="center"
                    flexWrap="wrap" // 屏幕太窄自动换行
                  >
                    <Checkbox
                      checked={!!s.completed}
                      disabled={s.reps === '' || s.weight === ''}
                      onChange={() => completeSetHandler(ex.exercise_type_id, idx)}
                      sx={{ flexShrink: 0 }}
                    />

                    <TextField
                      type="number"
                      label="Reps"
                      size="small"
                      value={s.reps === '' ? '' : s.reps}
                      placeholder={s.suggested?.reps ?? ''}
                      inputProps={{ min: 1, step: 1 }}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                        updateSet(ex.exercise_type_id, idx, 'reps', val);
                      }}
                      sx={{ width: { xs: 60, sm: 120 } }}
                    />

                    <TextField
                      type="number"
                      label="Weight"
                      size="small"
                      value={s.weight === '' ? '' : s.weight}
                      placeholder={s.suggested?.weight ?? ''}
                      inputProps={{ min: 0, step: 0.5 }}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                        updateSet(ex.exercise_type_id, idx, 'weight', val);
                      }}
                      sx={{ width: { xs: 80, sm: 140 } }}
                    />

                    <TextField
                      select
                      label="Unit"
                      size="small"
                      value={s.weight_unit ?? 'kg'}
                      onChange={(e) => updateSet(ex.exercise_type_id, idx, 'weight_unit', e.target.value)}
                      sx={{ width: { xs: 70, sm: 120 } }}
                    >
                      <MenuItem value="kg">kg</MenuItem>
                      <MenuItem value="lb">lb</MenuItem>
                    </TextField>

                    <TextField
                      type="number"
                      label="Rest (sec)"
                      size="small"
                      value={s.rest_sec === '' ? '' : s.rest_sec}
                      placeholder={s.suggested?.rest_sec ?? ''}
                      inputProps={{ min: 0, step: 1 }}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                        updateSet(ex.exercise_type_id, idx, 'rest_sec', val);
                      }}
                      sx={{ width: { xs: 80, sm: 160 } }}
                    />

                    <IconButton onClick={() => removeSet(ex.exercise_type_id, idx)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}

                <Button
                  startIcon={<AddIcon />}
                  size="small"
                  onClick={() => addSet(ex.exercise_type_id)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Add Set
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}

        {/* add switch to custom workout session in routine session */}
        {type === 'routine' && (
          <Button
            variant="outlined"
            onClick={() => showConfirm({
              title: 'Switch to Custom',
              message: 'To edit exercise types, you must switch to custom workout (current sets will be transferred). Continue?',
              onConfirm: () => convertToCustom() })
            }>
              Edit Exercise Types?
          </Button> )}

        <Divider />

        {/* Save / Cancel */}
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
          {type !== 'routine' && (
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={() => setPickerOpen(true)}
            >
              Add Exercises
            </Button>
          )}
          <Button
            variant="contained"
            disabled={!canSave || saveMutation.isPending}
            onClick={() => showConfirm({
              title: 'Save and upload workout',
              message: 'End your session and upload workout?',
              onConfirm: () => saveMutation.mutate(payloadBase)
            })}
          >
            Save Workout
          </Button>
          <Button
            variant="outlined"
            disabled={!canSave || saveMutation.isPending || type === 'routine'}
            onClick={() => showConfirm({
              title: 'Save workout as a routine',
              message: 'This workout will be updated and the exercises in it will be used to create a custom routine. Continue?',
              onConfirm: () => {
                const routineName = window.prompt('Save as Routine: enter a name');
                if (!routineName) return;
                saveMutation.mutate({ ...payloadBase, routineName });
            }})}
          >
            Save as Routine
          </Button>
          <Button color="error" onClick={() => stopAndReset()}>
            Cancel Session
          </Button>
        </Stack>
      </Stack>
    </CardContent>
  </Card>

  <ExercisePickerDialog
    open={pickerOpen}
    onClose={() => setPickerOpen(false)}
    onConfirm={onConfirmAdd}
  />
</Stack>

  );
}