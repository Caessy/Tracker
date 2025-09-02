import React, { useState, useEffect } from 'react';
import {
    Stack,
    Button,
    Typography,
    CircularProgress,
    Card,
    CardContent,
    IconButton,
    Box,
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
import { getMonthlyProgress, getYearlyProgress } from '../../services/api';

export default function Progress() {
    const [view, setView] = useState('month');
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
        if (view === 'month') {
            const monthStr = currentDate.format('YYYY-MM');
            const res = await getMonthlyProgress(monthStr);
            setData(res.data.data);
        } else {
            const yearStr = currentDate.format('YYYY');
            const res = await getYearlyProgress(yearStr);
            setData(res.data.data);
        }
        } catch (err) {
        console.error(err);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [view, currentDate]);

    const prev = () => {
        setCurrentDate((prevDate) =>
        view === 'month' ? prevDate.subtract(1, 'month') : prevDate.subtract(1, 'year')
        );
    };
    const next = () => {
        setCurrentDate((prevDate) =>
        view === 'month' ? prevDate.add(1, 'month') : prevDate.add(1, 'year')
        );
    };

    return (
        <Box p={2}>
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
            {/* 标题 + 切换按钮 */}
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
            >
                <Typography variant="h5" fontWeight={600}>
                Volume Change
                </Typography>
                <Stack direction="row" spacing={1}>
                <Button
                    variant={view === 'month' ? 'contained' : 'outlined'}
                    onClick={() => setView('month')}
                >
                    Month
                </Button>
                <Button
                    variant={view === 'year' ? 'contained' : 'outlined'}
                    onClick={() => setView('year')}
                >
                    Year
                </Button>
                </Stack>
            </Stack>

            {/* 时间导航 */}
            <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={2}
                mb={2}
            >
                <IconButton onClick={prev} size="small" color="primary">
                <ArrowBackIos fontSize="small" />
                </IconButton>
                <Typography variant="h6">
                {view === 'month'
                    ? currentDate.format('MMMM YYYY')
                    : currentDate.format('YYYY')}
                </Typography>
                <IconButton onClick={next} size="small" color="primary">
                <ArrowForwardIos fontSize="small" />
                </IconButton>
            </Stack>

            {/* 图表 */}
            {loading ? (
                <Stack alignItems="center" py={5}>
                <CircularProgress />
                </Stack>
            ) : (
                <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                        dataKey={view === 'month' ? 'workout_date' : 'year_month'}
                        tick={{ fill: '#ccc', fontSize: 12 }}
                    />
                    <YAxis tick={{ fill: '#ccc', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                        backgroundColor: '#333',
                        borderRadius: 8,
                        border: 'none',
                        }}
                        labelStyle={{ color: '#fff' }}
                        itemStyle={{ color: '#00bcd4' }}
                    />
                    <Line
                        type="monotone"
                        dataKey={view === 'month' ? 'daily_volume' : 'month_volume'}
                        stroke="#00bcd4"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                    </LineChart>
                </ResponsiveContainer>
                </Box>
            )}
            </CardContent>
        </Card>
        </Box>
    );
}
