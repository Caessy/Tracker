const express = require('express');
const session = require('express-session');
const db = require('./db.js');
const path = require('path');

const authRoutes = require('./routes/auth.js');
const workoutRouter = require('./routes/workout.js');
const exerciseRouter = require('./routes/exercise.js');

const app = express();
const port = process.env.PORT || 3000;

// Middleware for parsing JSON
app.use(express.json());


app.use(express.static(path.join(__dirname, '..', 'public')));


// Session middleware
app.use(session({
    secret: 'super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: 'lax',
        secure: false
    }
}));

// Route mounting
app.use('/', authRoutes);
app.use('/workouts', workoutRouter);
app.use('/exercise', exerciseRouter);

// Start server
app.listen(port, () => {
    console.log(`Server is now listening on port ${port}`);
});
