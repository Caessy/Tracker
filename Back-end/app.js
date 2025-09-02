require('dotenv').config({ path: './.env' });
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');


const authRouter = require('./routes/auth');
const mfaRouter = require('./routes/mfa');
const routineRouter = require('./routes/routine');
const workoutRouter = require('./routes/workout');
const chartRouter = require('./routes/chart');
const instructorRouter = require('./routes/instructor');
const exerciseRouter = require('./routes/exercise');
const bodyStatRouter = require('./routes/bodyStat');
const viewsRouter = require('./routes/views');


const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// rate limit to prevent brute-force (5 attempts per minute per ip)
const limiter = rateLimit({ windowMs: 60 * 1000, max: 5 });
app.use('/api/auth', limiter); // apply limiter to auth routes

app.use('/api/auth', authRouter);
app.use('/api/mfa', mfaRouter);
app.use('/api/routine', routineRouter);
app.use('/api/workout', workoutRouter);
app.use('/api/chart', chartRouter);
app.use('/api/instructor', instructorRouter);
app.use('/api/exercise', exerciseRouter);
app.use('/api/bodyStat', bodyStatRouter);
app.use('/api/views', viewsRouter);

app.get('/', (req, res) => {
    res.send('Workout Tracker API is running');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: { field: 'general', message: 'Internal server error' } });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
