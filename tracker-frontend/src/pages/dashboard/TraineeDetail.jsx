import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  IconButton,
  Stack,
  Button,
  CircularProgress,
  TextField,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { ArrowBackIos, ArrowForwardIos } from '@mui/icons-material';
import dayjs from 'dayjs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTraineeCalendarMonth,
  getTraineeMonthlyProgress,
  getTraineeYearlyProgress,
  getWorkoutById,
  getTraineeWorkoutComment,
  createTraineeWorkoutComment,
  updateTraineeWorkoutComment,
  deleteTraineeWorkoutComment,
} from '../../services/api';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useAlertStore } from '../../store/useAlertStore';

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} {...other}>
        {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
    }

    /* ---------------- Workout Detail Dialog ---------------- */
    const TraineeWorkoutDetailDialog = ({ open, workoutId, userId, onClose }) => {
    const [workout, setWorkout] = useState(null);
    const [commentOpen, setCommentOpen] = useState(false);

    useEffect(() => {
        if (open && workoutId) {
        getWorkoutById(workoutId)
            .then((res) => setWorkout(res.data.workout))
            .catch((err) => console.error('Failed to load workout:', err));
        }
    }, [open, workoutId]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Workout Details</DialogTitle>
        <DialogContent>
            {workout ? (
            <Stack spacing={2}>
                <Typography>Date: {dayjs(workout.date).format('YYYY-MM-DD')}</Typography>
                <Typography>Duration: {workout.duration_min} min</Typography>
                <Typography>Note: {workout.note || 'None'}</Typography>
                <Divider />
                <Typography variant="h6">Exercises</Typography>
                {workout.exercises?.map((ex) => (
                <Card key={ex.exercise_type_id} variant="outlined">
                    <CardContent>
                    <Typography variant="subtitle1">{ex.exercise_name}</Typography>
                    <Stack spacing={1} mt={1}>
                        {ex.sets.map((s, i) => (
                        <Stack direction="row" spacing={2} key={i} alignItems="center">
                            <Typography>Set {i + 1}:</Typography>
                            <Typography>Reps: {s.reps}</Typography>
                            <Typography>
                            Weight: {s.weight} {s.weight_unit}
                            </Typography>
                            <Typography>Rest: {s.rest_sec} sec</Typography>
                        </Stack>
                        ))}
                    </Stack>
                    </CardContent>
                </Card>
                ))}
            </Stack>
            ) : (
            <CircularProgress />
            )}
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Close</Button>
            <Button onClick={() => setCommentOpen(true)} variant="contained">
            Comment
            </Button>
        </DialogActions>

        {/* Comment Dialog */}
        <TraineeCommentDialog
            open={commentOpen}
            userId={userId}
            workoutId={workoutId}
            onClose={() => setCommentOpen(false)}
        />
        </Dialog>
    );
    };

    /* ---------------- Comment Dialog ---------------- */
    const TraineeCommentDialog = ({ open, userId, workoutId, onClose }) => {
    const queryClient = useQueryClient();
    const showAlert = useAlertStore((s) => s.showAlert);
    const [commentText, setCommentText] = useState('');
    const [editMode, setEditMode] = useState(false);

    const { data: commentData } = useQuery({
        queryKey: ['traineeComment', userId, workoutId],
        queryFn: () => getTraineeWorkoutComment(userId, workoutId),
        enabled: open,
    });

    const comment = commentData?.data?.comment;

    useEffect(() => {
        if (comment) {
        setCommentText(comment.comment_text);
        } else {
        setCommentText('');
        setEditMode(false);
        }
    }, [comment]);

    const createMut = useMutation({
        mutationFn: () => createTraineeWorkoutComment(userId, workoutId, commentText),
        onSuccess: () => {
        showAlert('Comment added successfully', 'success');
        queryClient.invalidateQueries(['traineeComment', userId, workoutId]);
        onClose();
        },
        onError: () => showAlert('Failed to add comment', 'error'),
    });

    const updateMut = useMutation({
        mutationFn: () => updateTraineeWorkoutComment(userId, workoutId, comment.id, commentText),
        onSuccess: () => {
        showAlert('Comment updated successfully', 'success');
        queryClient.invalidateQueries(['traineeComment', userId, workoutId]);
        setEditMode(false);
        },
        onError: () => showAlert('Failed to update comment', 'error'),
    });

    const deleteMut = useMutation({
        mutationFn: () => deleteTraineeWorkoutComment(userId, workoutId, comment.id),
        onSuccess: () => {
        showAlert('Comment deleted successfully', 'success');
        queryClient.invalidateQueries(['traineeComment', userId, workoutId]);
        onClose();
        },
        onError: () => showAlert('Failed to delete comment', 'error'),
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{comment ? 'Edit Comment' : 'Add Comment'}</DialogTitle>
        <DialogContent>
            <TextField
            label="Comment"
            multiline
            rows={4}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            fullWidth
            margin="normal"
            disabled={!editMode && !!comment}
            />
            {comment && !editMode && <Typography>{comment.comment_text}</Typography>}
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            {!comment ? (
            <Button onClick={() => createMut.mutate()} variant="contained" disabled={createMut.isPending}>
                Add Comment
            </Button>
            ) : editMode ? (
            <Button onClick={() => updateMut.mutate()} variant="contained" disabled={updateMut.isPending}>
                Save
            </Button>
            ) : (
            <>
                <Button onClick={() => setEditMode(true)}>Edit</Button>
                <Button onClick={() => deleteMut.mutate()} color="error" disabled={deleteMut.isPending}>
                Delete
                </Button>
            </>
            )}
        </DialogActions>
        </Dialog>
    );
    };

    /* ---------------- Main ---------------- */
    export default function TraineeDetail() {
    const { id } = useParams();
    const location = useLocation();
    const { username } = location.state || {};

    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event, newValue) => setTabValue(newValue);

    /* ---- Calendar ---- */
    const [calendarCurrentDate, setCalendarCurrentDate] = useState(dayjs());
    const [selectedWorkoutId, setSelectedWorkoutId] = useState(null);

    const calendarYear = calendarCurrentDate.format('YYYY');
    const calendarMonth = calendarCurrentDate.format('MM');

    const { data: monthData } = useQuery({
        queryKey: ['traineeCalendarMonth', calendarYear, calendarMonth, id],
        queryFn: () => getTraineeCalendarMonth(calendarYear, calendarMonth, id),
    });

    const startOfMonth = calendarCurrentDate.startOf('month');
    const endOfMonth = calendarCurrentDate.endOf('month');
    const daysInMonth = endOfMonth.date();
    const calendarDays = Array.from({ length: daysInMonth }, (_, i) =>
        startOfMonth.add(i, 'day')
    );

    const handleCalendarPrevMonth = () =>
        setCalendarCurrentDate(calendarCurrentDate.subtract(1, 'month'));
    const handleCalendarNextMonth = () =>
        setCalendarCurrentDate(calendarCurrentDate.add(1, 'month'));

    /* ---- Progress ---- */
    const [progressView, setProgressView] = useState('month');
    const [progressCurrentDate, setProgressCurrentDate] = useState(dayjs());
    const [progressData, setProgressData] = useState([]);
    const [progressLoading, setProgressLoading] = useState(false);

    const fetchProgressData = async () => {
        setProgressLoading(true);
        try {
        if (progressView === 'month') {
            const res = await getTraineeMonthlyProgress(progressCurrentDate.format('YYYY-MM'), id);
            setProgressData(res.data.data);
        } else {
            const res = await getTraineeYearlyProgress(progressCurrentDate.format('YYYY'), id);
            setProgressData(res.data.data);
        }
        } finally {
        setProgressLoading(false);
        }
    };

    useEffect(() => {
        fetchProgressData();
    }, [progressView, progressCurrentDate]);

    const progressPrev = () =>
        setProgressCurrentDate((prevDate) =>
        progressView === 'month' ? prevDate.subtract(1, 'month') : prevDate.subtract(1, 'year')
        );
    const progressNext = () =>
        setProgressCurrentDate((prevDate) =>
        progressView === 'month' ? prevDate.add(1, 'month') : prevDate.add(1, 'year')
        );

    return (
        <Box p={2}>
        <Typography variant="h5" gutterBottom>
            {username}'s Details
        </Typography>

        <Tabs value={tabValue} onChange={handleTabChange} aria-label="trainee tabs">
            <Tab label="Calendar" />
            <Tab label="Progress" />
        </Tabs>

        {/* ---- Calendar Tab ---- */}
        <TabPanel value={tabValue} index={0}>
            <Box p={2}>
            {/* 顶部工具栏 */}
            <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={3}
                sx={{
                borderRadius: 3,
                p: 1.5,
                bgcolor: 'background.paper',
                boxShadow: 3,
                }}
            >
                <IconButton onClick={handleCalendarPrevMonth} sx={{ color: 'text.primary' }}>
                <ArrowBackIos />
                </IconButton>
                <Typography variant="h5" fontWeight={700}>
                {calendarCurrentDate.format('MMMM YYYY')}
                </Typography>
                <IconButton onClick={handleCalendarNextMonth} sx={{ color: 'text.primary' }}>
                <ArrowForwardIos />
                </IconButton>
            </Box>

            {/* 周标题 */}
            <Grid container spacing={1} mb={1}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Grid item xs={12 / 7} key={day}>
                    <Typography
                    variant="subtitle2"
                    sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}
                    >
                    {day}
                    </Typography>
                </Grid>
                ))}
            </Grid>

            {/* 日历格子 */}
            <Grid container spacing={1}>
                {calendarDays.map((day) => {
                const dayStr = day.format('YYYY-MM-DD');
                const workouts = monthData?.data?.calendar?.[dayStr] || [];
                const isToday = day.isSame(dayjs(), 'day');

                return (
                    <Grid item xs={12 / 7} key={dayStr}>
                    <Box
                        sx={{
                        minHeight: 90,
                        p: 1,
                        borderRadius: 3,
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'scale(1.05)', boxShadow: 4 },
                        }}
                        onClick={() => setSelectedWorkoutId(workouts[0]?.id || null)}
                    >
                        {/* 日期数字 */}
                        <Box
                        sx={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            bgcolor: isToday ? 'secondary.main' : 'rgba(255,255,255,0.05)',
                            color: isToday ? '#000' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 0.7,
                            fontWeight: 600,
                        }}
                        >
                        {day.date()}
                        </Box>

                        {/* Workout 徽章 */}
                        {workouts.map((w, idx) => (
                        <Box
                            key={idx}
                            sx={{
                            bgcolor: w.name === 'Custom Workout' ? 'primary.main' : 'success.main',
                            color: 'white',
                            px: 0.7,
                            py: 0.3,
                            mt: 0.3,
                            borderRadius: 1,
                            fontSize: 12,
                            textAlign: 'center',
                            }}
                            onClick={() => setSelectedWorkoutId(w.id)}
                        >
                            {Number(w.volume || 0).toFixed(2)}
                        </Box>
                        ))}
                    </Box>
                    </Grid>
                );
                })}
            </Grid>

            {/* 图例 */}
            <Box display="flex" mt={3} gap={3}>
                <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ width: 16, height: 16, bgcolor: 'primary.main', borderRadius: 0.5 }} />
                <Typography variant="body2">Custom Workout</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ width: 16, height: 16, bgcolor: 'success.main', borderRadius: 0.5 }} />
                <Typography variant="body2">Routine Workout</Typography>
                </Box>
            </Box>
            </Box>
        </TabPanel>

        {/*  Progress Tab  */}
        <TabPanel value={tabValue} index={1}>
            <Stack spacing={3} p={2}>
            <Box
                sx={{
                borderRadius: 3,
                p: 2,
                bgcolor: 'background.paper',
                boxShadow: 3,
                }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight={700}>
                    Volume Change
                </Typography>
                <Stack direction="row" spacing={2}>
                    <Button
                    variant={progressView === 'month' ? 'contained' : 'outlined'}
                    onClick={() => setProgressView('month')}
                    >
                    Month
                    </Button>
                    <Button
                    variant={progressView === 'year' ? 'contained' : 'outlined'}
                    onClick={() => setProgressView('year')}
                    >
                    Year
                    </Button>
                </Stack>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <IconButton onClick={progressPrev} sx={{ color: 'text.primary' }}>
                    <ArrowBackIos />
                </IconButton>
                <Typography variant="h6">
                    {progressView === 'month'
                    ? progressCurrentDate.format('YYYY-MM')
                    : progressCurrentDate.format('YYYY')}
                </Typography>
                <IconButton onClick={progressNext} sx={{ color: 'text.primary' }}>
                    <ArrowForwardIos />
                </IconButton>
                </Stack>

                {progressLoading ? (
                <Stack alignItems="center">
                    <CircularProgress />
                </Stack>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                        dataKey={progressView === 'month' ? 'workout_date' : 'year_month'}
                        stroke="rgba(255,255,255,0.7)"
                    />
                    <YAxis stroke="rgba(255,255,255,0.7)" />
                    <Tooltip
                        contentStyle={{
                        backgroundColor: '#222',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey={progressView === 'month' ? 'daily_volume' : 'month_volume'}
                        stroke="#00bcd4"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                    </LineChart>
                </ResponsiveContainer>
                )}
            </Box>
            </Stack>
        </TabPanel>

        {/* Workout Detail Dialog */}
        <TraineeWorkoutDetailDialog
            open={!!selectedWorkoutId}
            workoutId={selectedWorkoutId}
            userId={id}
            onClose={() => setSelectedWorkoutId(null)}
        />
        </Box>
    );
}
