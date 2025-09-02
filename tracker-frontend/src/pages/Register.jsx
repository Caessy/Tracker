import { useState } from 'react';
import { TextField, Button, Box, Typography, Alert, IconButton, InputAdornment, Snackbar } from '@mui/material';
import api from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import {Visibility, VisibilityOff } from '@mui/icons-material';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const navigate = useNavigate();

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;

    const handleSubmit = async (e) => {
        e.preventDefault(); // prevent default form to be submitted
        if (!passwordRegex.test(password)) {
            setError('Password must include uppercase, lowercase, number and special character with a length between 8 to 128');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/register', { username, password, email });
            // a snackbar to prompt registration success and redirecting to login page after 2s
            setSnackbarOpen(true);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Register failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 400, mx: 'auto', mt: 10 }}>
            <Typography variant="h5">Register</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <form onSubmit={handleSubmit}>
                <TextField
                    label="Username"
                    required
                    fullWidth
                    margin="normal"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                    label="Email"
                    type="email"
                    required
                    fullWidth
                    margin="normal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    required
                    fullWidth
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={() => setShowPassword(!showPassword)}
                                    edge="end"
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />
                <TextField
                    label="Confirm Password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    fullWidth
                    margin="normal"
                    value={confirmPassword}
                    onChange={(e) => {setConfirmPassword(e.target.value); setError('') }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    edge="end"
                                >
                                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                />
                <Button type="submit" variant="contained" fullWidth disabled={loading}>
                    {loading ? 'Registering...' : 'Register'}
                </Button>
            </form>
            <Typography sx={{ mt: 2 }}><Link to="/login">Already Registered? Login</Link></Typography>
            {/*Success Prompt */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={2000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="success" sx={{ width: '100%' }}>
                    Registration Successful! Redirecting to Login...
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Register;