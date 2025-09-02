import { Box, Typography, Button } from '@mui/material';
import { link } from 'react-router-dom';

function Welcome() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
            <Typography variant="h3">Welcome to Workout Tracker</Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>Track training easily and see your progress</Typography>
            <Box sx={{ mt: 4 }}>
                <Button variant="contained" component={link} to="/login" sx={{ mr: 2 }}>Login</Button>
                <Button variant="outlined" component={link} to="/register">Register</Button>
            </Box>
        </Box>
    );
};

export default Welcome;