import { useState, useContext } from 'react';
import { TextField, Button, Box, Typography, Alert, IconButton, InputAdornment } from '@mui/material';
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
        <Box sx={{ maxWidth: 400, mx: 'auto', mt: 10 }}>
            <Typography variant="h5">Login</Typography>
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
                        )
                    }}
                />
                <Button type="submit" variant="contained" fullWidth disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </Button>
            </form>
            <Typography sx={{ mt: 2 }}>
                <Link to="/register">Register</Link> | <Link to="/forgot-password">Forgot Password?</Link>
            </Typography>
            <Typography sx={{ mt: 2 }}><Link to="/">Back to Welcome Page</Link></Typography>
        </Box>
    );
};

export default Login;