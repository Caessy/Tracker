const express = require('express');
const db = require('../db.js');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// add new workout
router.post('/', (req, res) => {
    const user_id = req.session.user_id;
    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // make sure in the right form
        const { date, duration_min, note, exercises } = req.body;

        if (!date || !Array.isArray(exercises)) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        // insert workout table
        const insertWorkout = db.prepare(`
            INSERT INTO workouts (user_id, date, duration_min, note)
            VALUES (?, ?, ?, ?)
        `);
        const workoutInfo = insertWorkout.run(user_id, date, duration_min, note);
        const workout_id = workoutInfo.lastInsertRowid;

        // insert into exerciselog table
        const insertExerciseLog = db.prepare(`
            INSERT INTO exercise_logs (workout_id, exercise_type_id)
            VALUES (?, ?)
        `);

        // insert into exerciseSet table
        const insertExerciseSet = db.prepare(`
            INSERT INTO exercise_sets (exercise_log_id, set_order, reps, weight, rest_sec)
            VALUES (?, ?, ?, ?, ?)
        `);

        // iterate every exercise
        exercises.forEach(exercise => {
            const { exercise_type_id, sets } = exercise;

            const logInfo = insertExerciseLog.run(workout_id, exercise_type_id);
            const exercise_log_id = logInfo.lastInsertRowid;

            sets.forEach(set => {
                insertExerciseSet.run(
                    exercise_log_id,
                    set.set_order,
                    set.reps,
                    set.weight,
                    set.rest_sec || null
                );
            });
        });

        res.json({ message: 'Workout saved', workout_id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save workout' });
    }
});

// get workouts by date
router.get('/by-date', (req, res) => {
    const { date } = req.query;
    const user_id = req.session.user_id;

    if (!date) {
        return res.status(400).json({ error: 'Missing date' });
    }

    try {
        const workouts = db.prepare(`
            SELECT w.id AS workout_id, w.date, w.duration_min, w.note,
                et.id AS exercise_type_id, et.name AS exercise_name, et.muscle_group
            FROM workouts w
            JOIN exercise_logs el ON w.id = el.workout_id
            JOIN exercise_types et ON el.exercise_type_id = et.id
            WHERE w.user_id = ? AND w.date = ?
            ORDER BY w.id, et.name
        `).all(user_id, date);

        // structuring a map for storing workout log
        const workoutMap = {};
        workouts.forEach(row => {
            if (!workoutMap[row.workout_id]) {
                workoutMap[row.workout_id] = {
                    workout_id: row.workout_id,
                    date: row.date,
                    duration_min: row.duration_min,
                    note: row.note,
                    exercises: []
                };
            }

            workoutMap[row.workout_id].exercises.push({
                exercise_type_id: row.exercise_type_id,
                name: row.exercise_name,
                muscle_group: row.muscle_group
            });
        });

        res.json(Object.values(workoutMap));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// deleting a workout
router.delete('/:id', (req, res) => {
    const user_id = req.session.userId;
    const workout_id = req.params.id;

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // making sure only delete workout owned by the user
        const workout = db.prepare(`SELECT * FROM workouts WHERE id = ? AND user_id = ?`)
                        .get(workout_id, user_id);

        if (!workout) {
            return res.status(404).json({ error: 'Workout not found or unauthorized.' });
        }

        // order: sets -> logs -> workout
        db.prepare(`DELETE FROM exercise_sets WHERE exercise_log_id IN 
            (SELECT id FROM exercise_logs WHERE workout_id = ?)`).run(workout_id);

        db.prepare(`DELETE FROM exercise_logs WHERE workout_id = ?`).run(workout_id);
        db.prepare(`DELETE FROM workouts WHERE id = ?`).run(workout_id);

        res.json({ message: 'Workout deleted.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
