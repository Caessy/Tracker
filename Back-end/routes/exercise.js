const express = require('express');
const db = require('../db.js');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// secure login
router.use(authMiddleware);

// add a new exercise type
router.post('/add', (req, res) => {
    const { name, muscle_group } = req.body;

    if (!name || !muscle_group) {
        return res.status(400).json({ error: 'Name and muscle_group are required.' });
    }

    try {
        const existing = db.prepare(`SELECT * FROM exercise_types WHERE name = ?`).get(name);
        if (existing) {
            return res.status(400).json({ error: 'Exercise already exists.' });
        }

        db.prepare(`INSERT INTO exercise_types (name, muscle_group) VALUES (?, ?)`)
          .run(name, muscle_group);

        res.status(201).json({ message: 'Exercise type added.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// get all exercise types (not only user used)
router.get('/all', (req, res) => {
  try {
    const exercises = db.prepare(`
      SELECT id, name, muscle_group
      FROM exercise_types
      ORDER BY name
    `).all();

    res.json(exercises);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// get history by a specific exercise
router.get('/exercise/history/:name', (req, res) => {
    const { name } = req.params;
    const user_id = req.session.user_id;  // access directly from session

    try {
        // find the exercise type
        const exerciseType = db.prepare(`
            SELECT id FROM exercise_types WHERE name = ?
        `).get(name);

        if (!exerciseType) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        // select all history of this exercise
        const logs = db.prepare(`
            SELECT
                workouts.date,
                exercise_sets.set_order,
                exercise_sets.reps,
                exercise_sets.weight
            FROM exercise_logs
            JOIN workouts ON workouts.id = exercise_logs.workout_id
            JOIN exercise_sets ON exercise_sets.exercise_log_id = exercise_logs.id
            WHERE exercise_logs.exercise_type_id = ?
              AND workouts.user_id = ?
            ORDER BY workouts.date ASC, exercise_sets.set_order ASC
        `).all(exerciseType.id, user_id);

        res.json({ name, logs });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// get volume of a specific exercise for graphs in the front end
router.get('/exercise/progress/:name', (req, res) => {
    const { name } = req.params;
    const user_id = req.session.user_id;

    try {
        const exerciseType = db.prepare(`
            SELECT id FROM exercise_types WHERE name = ?
        `).get(name);

        if (!exerciseType) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        const rows = db.prepare(`
            SELECT
                workouts.date,
                exercise_sets.reps,
                exercise_sets.weight
            FROM exercise_logs
            JOIN workouts ON workouts.id = exercise_logs.workout_id
            JOIN exercise_sets ON exercise_sets.exercise_log_id = exercise_logs.id
            WHERE exercise_logs.exercise_type_id = ?
              AND workouts.user_id = ?
        `).all(exerciseType.id, user_id);

        // calculate volume
        const volumeByDate = {};

        rows.forEach(row => {
            const { date, reps, weight } = row;
            if (!volumeByDate[date]) {
                volumeByDate[date] = 0;
            }
            volumeByDate[date] += reps * weight;
        });

        const progress = Object.entries(volumeByDate).map(([date, total_volume]) => ({
            date,
            total_volume
        }));

        res.json({ name, progress });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// get all exercises one user have done (for search purposes)
router.get('/used', (req, res) => {
    const user_id = req.session.userId;

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const exercises = db.prepare(`
            SELECT DISTINCT et.id, et.name, et.muscle_group
            FROM exercise_logs el
            JOIN workouts w ON el.workout_id = w.id
            JOIN exercise_types et ON el.exercise_type_id = et.id
            WHERE w.user_id = ?
            ORDER BY et.name
        `).all(user_id);

        res.json(exercises);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


module.exports = router;
