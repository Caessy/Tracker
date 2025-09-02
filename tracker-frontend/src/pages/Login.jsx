import { useState, useContext } from 'react';
import { TextField, Button, Box, Typography, Alert, IconButton, InputAdornment, Stack } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { setUser } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/login', { username, password });
            if (res.data.mfaRequired) {
                localStorage.setItem('token', res.data.tempToken);
                if (res.data.user) setUser(res.data.user);
                navigate('/mfa');
            } else {
                localStorage.setItem('token', res.data.token);
                setUser(res.data.user);
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Login Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            
            <Stack spacing={2}>
{error && <Alert severity="error">{error}</Alert>}


<TextField
label="Username"
required
fullWidth
margin="normal"
value={username}
autoComplete="username"
onChange={(e) => setUsername(e.target.value)}
/>


<TextField
label="Password"
type={showPassword ? 'text' : 'password'}
required
fullWidth
margin="normal"
value={password}
autoComplete="current-password"
onChange={(e) => setPassword(e.target.value)}
InputProps={{
endAdornment: (
<InputAdornment position="end">
<IconButton onClick={() => setShowPassword(!showPassword)} edge="end" aria-label="toggle password visibility">
{showPassword ? <VisibilityOff /> : <Visibility />}
</IconButton>
</InputAdornment>
),
}}
/>


<Button type="submit" variant="contained" fullWidth disabled={loading} size="large">
{loading ? 'Logging in...' : 'Login'}
</Button>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <Button
                    component={Link}
                    to="/register"
                    variant="outlined"
                    color="secondary"
                >
                    Register
                </Button>
                <Button
                    component={Link}
                    to="/forgot-password"
                    variant="outlined"
                    color="error"
                >
                    Forgot Password?
                </Button>
            </Box>
            </Stack>
        </Box>
    );
};

export default Login;