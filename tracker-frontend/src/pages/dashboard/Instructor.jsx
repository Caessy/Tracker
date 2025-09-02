import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Typography, Accordion, AccordionSummary, AccordionDetails, Grid, Card, CardContent, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import { getTrainees, getInstructors, becomeInstructor, generateLink, acceptLink, deleteLink } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useAlertStore } from '../../store/useAlertStore';
import { useConfirmDialogStore } from '../../store/useConfirmDialogStore';

export default function Instructor() {
    const queryClient = useQueryClient();
    const showAlert = useAlertStore(s => s.showAlert);
    const showConfirm = useConfirmDialogStore(s => s.show);
    const navigate = useNavigate();
    const { user, setUser } = useAuthStore();

    const [generateOpen, setGenerateOpen] = useState(false);
    const [generatedToken, setGeneratedToken] = useState(null);
    const [acceptOpen, setAcceptOpen] = useState(false);
    const [acceptToken, setAcceptToken] = useState('');

    const isInstructor = user?.is_instructor === 1;

    // 日志 isInstructor 变化
    useEffect(() => {
        console.log('isInstructor status:', isInstructor);
    }, [isInstructor]);

    // 获取trainees
    const { data: traineesData } = useQuery({
        queryKey: ['trainees'],
        queryFn: getTrainees,
        enabled: isInstructor,
        onSuccess: (data) => console.log('Trainees Data:', data),
        onError: (err) => {
            console.error('Trainees Query Error:', err);
            showAlert('Failed to load trainees', 'error');
        },
    });
    const trainees = traineesData?.data?.trainees || [];

    // 获取instructors 添加 onError 和 onSuccess 日志）
    const { data: instructorsData } = useQuery({
        queryKey: ['instructors'],
        queryFn: getInstructors,
        onSuccess: (data) => console.log('Instructors Data:', data),
        onError: (err) => {
            console.error('Instructors Query Error:', err);
            showAlert('Failed to load instructors', 'error');
        },
    });
    const instructors = instructorsData?.data?.instructors || [];

    // become an instructor
    const becomeMut = useMutation({
        mutationFn: becomeInstructor,
        onSuccess: (data) => {
            localStorage.setItem('token', data.data.token);
            setUser(data.data.user);
            showAlert('You are now an instructor!', 'success');
            queryClient.invalidateQueries(['trainees']);
        },
        onError: (err) => {
            console.error('Become Error:', err);
            if (err.response?.status === 403) {
                showAlert('Access denied—try logging out and in', 'error');
            } else {
                showAlert('Failed to become instructor', 'error');
            }
        },
    });

    // 生成link
    const generateMut = useMutation({
        mutationFn: generateLink,
        onSuccess: (data) => {
            console.log('Generate API Response:', data);
            if (data?.data?.token) {
                setGeneratedToken(data.data.token);
                setGenerateOpen(true);
                showAlert('Token generated successfully', 'success');
            } else {
                showAlert('Token missing in response', 'error');
            }
        },
        onError: (err) => {
            console.error('Generate Error:', err);
            showAlert('Failed to generate token', 'error');
        },
    });

    // 接受link（添加 instructors invalidate）
    const acceptMut = useMutation({
        mutationFn: (token) => acceptLink(token),
        onSuccess: () => {
            showAlert('Link accepted successfully', 'success');
            queryClient.invalidateQueries(['trainees', 'instructors']);  // 刷新两个列表
            setAcceptOpen(false);
            setAcceptToken('');
        },
        onError: (err) => {
            console.error('Accept Link Error:', err);
            showAlert('Failed to accept link', 'error');
        },
    });

    // 删除link
    const deleteMut = useMutation({
        mutationFn: (linkId) => deleteLink(linkId),
        onSuccess: () => {
            showAlert('Link deleted successfully', 'success');
            queryClient.invalidateQueries(['trainees', 'instructors']);
        },
        onError: (err) => {
            console.error('Delete Link Error:', err);
            showAlert('Failed to delete link', 'error');
        },
    });

    const handleBecome = () => {
        becomeMut.mutate();
    };

    const handleGenerate = () => {
        generateMut.mutate();
    };

    const handleAcceptSubmit = () => {
        acceptMut.mutate(acceptToken);
    };

    const handleDelete = (linkId, isTrainee) => {
        showConfirm({
            title: 'Delete Link',
            message: `Are you sure you want to delete this ${isTrainee ? 'trainee' : 'instructor'} link?`,
            onConfirm: () => deleteMut.mutate(linkId),
        });
    };

    return (
        <Box p={2}>
            <Typography variant="h5" gutterBottom>Instructor Dashboard</Typography>

            {/* Buttons */}
            <Box display="flex" gap={2} mb={3}>
                {!isInstructor ? (
                    <Button variant="contained" onClick={handleBecome} disabled={becomeMut.isPending}>
                        Become Instructor
                    </Button>
                ) : (
                    <Button variant="contained" onClick={() => setAcceptOpen(true)}>
                        Accept Link
                    </Button>
                )}
                <Button variant="outlined" onClick={handleGenerate} disabled={generateMut.isPending}>
                    Generate Code
                </Button>
            </Box>

            {/* Trainees List */}
            <Accordion defaultExpanded={isInstructor}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Your Trainees</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={2}>
                        {trainees.map((t) => (
                            <Grid item xs={12} sm={6} md={4} key={t.link_id}>
                                <Card onClick={() => navigate(`/dashboard/instructor/trainee/${t.trainee_id}`, { state: { username: t.trainee_username } })} sx={{ cursor: 'pointer' }}>
                                    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="subtitle1">{t.trainee_username}</Typography>
                                        <IconButton onClick={() => handleDelete(t.link_id, true)} color="error">
                                            <DeleteIcon />
                                        </IconButton>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                        {trainees.length === 0 && (
                            <Typography variant="body2" color="text.secondary">No trainees yet.</Typography>
                        )}
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Instructors List */}
            <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Your Instructors</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={2}>
                        {instructors.map((i) => (
                            <Grid item xs={12} sm={6} md={4} key={i.link_id}>
                                <Card>
                                    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="subtitle1">{i.instructor_username}</Typography>
                                        <IconButton onClick={() => handleDelete(i.link_id, false)} color="error">
                                            <DeleteIcon />
                                        </IconButton>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                        {instructors.length === 0 && (
                            <Typography variant="body2" color="text.secondary">No instructors yet.</Typography>
                        )}
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Generate Token Dialog */}
            <Dialog open={generateOpen} onClose={() => setGenerateOpen(false)}>
                <DialogTitle>Generated Code</DialogTitle>
                <DialogContent>
                    {generatedToken ? (
                        <Typography>Share this code with your instructor: <strong>{generatedToken}</strong></Typography>
                    ) : (
                        <Typography color="error">No token generated. Try again.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setGenerateOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Accept Link Dialog */}
            <Dialog open={acceptOpen} onClose={() => setAcceptOpen(false)}>
                <DialogTitle>Accept Link</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Enter Code"
                        value={acceptToken}
                        onChange={(e) => setAcceptToken(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAcceptOpen(false)}>Cancel</Button>
                    <Button onClick={handleAcceptSubmit} variant="contained" disabled={acceptMut.isPending}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}