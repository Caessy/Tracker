import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCalendarMonth, getCalendarDay } from '../../services/api';
import {
    Box,
    Grid,
    Typography,
    IconButton,
    TextField,
} from '@mui/material';
import { ArrowBackIos, ArrowForwardIos } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import WorkoutDetailDialog from '../../components/WorkoutDetailDialog';

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedWorkoutId, setSelectedWorkoutId] = useState(null);
    const [pickerOpen, setPickerOpen] = useState(false);

    const year = currentDate.format('YYYY');
    const month = currentDate.format('MM');

    const { data: monthData } = useQuery({
        queryKey: ['calendarMonth', year, month],
        queryFn: () => getCalendarMonth(year, month),
    });

    const { data: dayData } = useQuery({
        queryKey: ['calendarDay', selectedDay],
        queryFn: () => getCalendarDay(selectedDay),
        enabled: !!selectedDay,
    });

    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const daysInMonth = endOfMonth.date();
    const calendarDays = Array.from({ length: daysInMonth }, (_, i) =>
        startOfMonth.add(i, 'day')
    );

    const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
    const handleNextMonth = () => setCurrentDate(currentDate.add(1, 'month'));
    const handleSelectDate = (date) => setCurrentDate(date);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <Box p={3}>
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
            <IconButton onClick={handlePrevMonth} sx={{ color: 'text.primary' }}>
            <ArrowBackIos />
            </IconButton>

            <Typography variant="h5" fontWeight={700}>
            {currentDate.format('MMMM YYYY')}
            </Typography>

            <IconButton onClick={handleNextMonth} sx={{ color: 'text.primary' }}>
            <ArrowForwardIos />
            </IconButton>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
                open={pickerOpen}
                onOpen={() => setPickerOpen(true)}
                onClose={() => setPickerOpen(false)}
                value={currentDate}
                onChange={handleSelectDate}
                renderInput={(params) => <TextField {...params} size="small" />}
            />
            </LocalizationProvider>
        </Box>

        {/* 周标题 */}
        <Grid container spacing={1} mb={1}>
            {weekDays.map((day) => (
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
                    '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: 4,
                    },
                    }}
                    onClick={() => setSelectedDay(dayStr)}
                >
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

                    {workouts.map((w, idx) => (
                    <Box
                        key={idx}
                        sx={{
                        bgcolor:
                            w.name === 'Custom Workout'
                            ? 'primary.main'
                            : 'success.main',
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

        <WorkoutDetailDialog
            open={!!selectedWorkoutId}
            workoutId={selectedWorkoutId}
            onClose={() => setSelectedWorkoutId(null)}
            onRoutineCreate={(workout) => console.log('Create Routine', workout)}
            onCustomSession={(workout) => console.log('Start Custom Session', workout)}
        />
        </Box>
    );
};

export default Calendar;
