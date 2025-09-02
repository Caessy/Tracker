require('dotenv').config({ path: '../.env' });
const express = require('express');
const db = require('../db/connection');
const authenticateToken = require('../middleware/authmid');
const { logEvent } = require('../utils/audit_logs.js');
const joi = require('joi');

const router = express.Router();

router.use(authenticateToken);

// joi schemas for validation (both create and update)
const workoutSchema = joi.object({
    date: joi.date().iso().required().messages({
        'date.base': 'Date must be valid ISO date',
        'any.required': 'Date is required'
    }),
    duration_min: joi.number().integer().optional().messages({
        'number.base': 'Duration must be a number',
    }),
    note: joi.string().allow('').optional().messages({
        'string.base': 'Note must be a string',
    }),
    exercises: joi.array().items(
        joi.object({
            exercise_type_id: joi.number().integer().required().messages({
                'number.base': 'Exercise type ID must be a number',
                'any.required': 'Exercise type ID is required',
            }),
            sets: joi.array().items(
                joi.object({
                    reps: joi.number().integer().min(1).required().messages({
                        'number.base': 'Reps must be a number',
                        'number.min': 'Reps must be at least 1',
                        'any.required': 'Reps is required',
                    }),
                    weight: joi.number().min(0).required().messages({
                        'number.base': 'Weight must be a number',
                        'number.min': 'Weight must be non-negative',
                        'any.required': 'Weight is required',
                    }),
                    weight_unit: joi.string().valid('kg', 'lb').default('kg').optional().messages({
                        'string.valid': 'Weight unit must be "kg" or "lb"',
                    }),
                    rest_sec: joi.number().integer().min(0).optional().messages({
                        'number.base': 'Rest seconds must be a number',
                        'number.min': 'Rest seconds must be non-negative',
                    }),
                })
            ).required().messages({
                'array.base': 'Sets must be an array',
                'any.required': 'Sets are required',
            }),
        })
    ).required().messages({
        'array.base': 'Exercises must be an array',
        'any.required': 'Exercises are required'
    }),
});

const routineWorkoutSchema = workoutSchema.keys({
    routine_id: joi.number().integer().positive().optional().messages({
        'number.base': 'Routine id must be a number',
    }),
    routineName: joi.string().min(1).max(50).optional().messages({
        'string.min': 'Routine name must be at least 3 characters',
        'any.required': 'Routine name is required for with-routine endpoints'
    }),
    description: joi.string().allow(null, '').max(255).optional(),
}).xor('routine_id', 'routineName');

// query for exercises array
const queryForExercises = `
    SELECT json_group_array(
        json_object(
            'exercise_type_id', el.exercise_type_id,
            'sets', (SELECT json_group_array(
            json_object('reps', es.reps, 'weight', es.weight, 'weight_unit', es.weight_unit, 'rest_sec', es.rest_sec)
            ) FROM exercise_sets es WHERE es.exercise_log_id = el.id ORDER BY es.set_order)
        )
    ) AS exercises
    FROM exercise_logs el
    WHERE el.workout_id = ?
`

// Helper for Joi error handling
const handleJoiError = (error) => {
    return error.details.map((detail) => ({
        field: detail.context.key,
        message: detail.message,
    }));
};

// helper: create routine and fill routine_exercises with max volume suggested
function createRoutine (userId, routineName, description, workoutExercises) {
    const insert = db.prepare(`INSERT INTO routines (user_id, name, description) VALUES (?, ?, ?)`);
    const result = insert.run(userId, routineName, description);
    const routineId = result.lastInsertRowid;

    workoutExercises.forEach((ex, order) => {
        db.prepare(`INSERT INTO routine_exercises (
            routine_id, exercise_type_id, exercise_order
        ) VALUES (?, ?, ?)`)
        .run(
            routineId,
            ex.exercise_type_id,
            order + 1,
        );
    });
    return routineId;
}


// helper: create workout
function createWorkout (userId, date, duration_min, note, exercises) {
    const workoutStmt = db.prepare(`INSERT INTO workouts (user_id, date, duration_min, note) VALUES (?, ?, ?, ?)`);
    const workoutResult = workoutStmt.run(userId, date, duration_min || null, note || null);
    const workoutId = workoutResult.lastInsertRowid;

    exercises.forEach((ex) => {
        const logStmt = db.prepare(`INSERT INTO exercise_logs (workout_id, exercise_type_id) VALUES (?, ?)`);
        const logResult = logStmt.run(workoutId, ex.exercise_type_id);
        const logId = logResult.lastInsertRowid;

        const setStmt = db.prepare(`INSERT INTO exercise_sets (exercise_log_id, set_order, reps, weight, weight_unit, rest_sec) VALUES (?, ?, ?, ?, ?, ?)`);
        ex.sets.forEach((set, index) => {
            setStmt.run(
                logId,
                index + 1,
                set.reps,
                set.weight,
                set.weight_unit || 'kg',
                set.rest_sec || null
            );
        });
    });
    return workoutId;
}

// helper: update workout
function updateWorkout(workoutId, userId, date, duration_min, note, exercises, routineId) {
    db.transaction(() => {
        db.prepare(`
            UPDATE workouts SET
                date = ?,
                duration_min = ?,
                note = ?,
                routine_id = ?
            WHERE id = ? AND user_id = ?
        `).run(
            date,
            duration_min || null,
            note || null,
            routineId || null,
            workoutId,
            userId
        );

        // 清空旧 logs & sets
        db.prepare(`
            DELETE FROM exercise_sets WHERE exercise_log_id IN (
                SELECT id FROM exercise_logs WHERE workout_id = ?
            )
        `).run(workoutId);
        db.prepare(`DELETE FROM exercise_logs WHERE workout_id = ?`).run(workoutId);

        // 插入新的 logs & sets
        const logStmt = db.prepare(`INSERT INTO exercise_logs (workout_id, exercise_type_id) VALUES (?, ?)`);
        const setStmt = db.prepare(`
            INSERT INTO exercise_sets (exercise_log_id, set_order, reps, weight, weight_unit, rest_sec)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        exercises.forEach((ex) => {
            const logResult = logStmt.run(workoutId, ex.exercise_type_id);
            const logId = logResult.lastInsertRowid;

            ex.sets.forEach((set, index) => {
                setStmt.run(
                    logId,
                    index + 1,
                    set.reps,
                    set.weight,
                    set.weight_unit || 'kg',
                    set.rest_sec || null
                );
            });
        });
    })();
}


// Authorization helper
function isAuthorized(req, targetUserId) {
    if (req.user.id === targetUserId) return true;
    if (req.user.is_instructor !== 1) return false;
    const link = db.prepare(`
        SELECT * FROM user_instructor_links
        WHERE user_id = ? AND instructor_id = ? AND expires_at > CURRENT_TIMESTAMP
    `).get(targetUserId, req.user.id);

    return !!link; // turning link into BOOLEAN value
}


// create workout with routine
router.post('/with-routine', async (req, res) => {
    const { routine_id, routineName, description, date, duration_min, note, exercises } = req.body;
    const userId = req.user.id;

    // validate workout in good format
    const { error } = routineWorkoutSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({ errors: handleJoiError(error) });
    }

    let workoutId; //make sure catch can get it
    let routineId;
    try {
        // start a transaction
        db.transaction(() => {
            workoutId = createWorkout(userId, date, duration_min, note, exercises);

            if (routine_id !== null) {
                db.prepare(`UPDATE workouts SET routine_id = ? WHERE id = ?`).run(routine_id, workoutId);
                routineId = routine_id;
            } else if (routineName) {
                routineId = createRoutine(userId, routineName, description, exercises);
                db.prepare(`UPDATE workouts SET routine_id = ? WHERE id = ?`).run(routineId, workoutId);
            }
        })();
        
        logEvent(userId, 'workout_created', `Workout created by user ${req.user.username}`, req.ip);
        res.status(201).json({ message: 'Workout created successfully', workout_id: workoutId, routine_id: routineId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// create workout without routine
router.post('/', async (req, res) => {
    console.log(req.body);
    const { date, duration_min, note, exercises } = req.body;
    const { error } = workoutSchema.validate(req.body);
    if (error) {
        console.log(error.details);
        return res.status(400).json({ errors: handleJoiError(error) })
    };

    try {
        let workoutId;
        db.transaction(() => {
            workoutId = createWorkout(req.user.id, date, duration_min, note, exercises, null);
        })();

        logEvent(req.user.id, 'workout_created', `Workout created by user ${req.user.username}`, req.ip);
        res.status(201).json({ message: 'Workout created successfully', workout_id: workoutId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});


// get workout list
// filtered by date; filtered by user if the instructor is authorized
router.get('/', (req, res) => {
    // using req.query for get routes, req.body for POST and PUT
    const { date, user_id } = req.query;

    const { error } = joi.string().isoDate().required().validate(date);
    if (error) return res.status(400).json({ error: 'Invalid date' });

    // if user_id present, then it is requested by instructor
    let targetUserId = parseInt(user_id) || req.user.id;

    if (!isAuthorized(req, targetUserId)) {
        return res.status(403).json({ error: { field: 'general', message: 'Unauthorized access' } });
    }

    try {

        // return workout list with id and date with HH:MM:SS
        // if workout created as a routine, name it as the routine's name, otherwise, 'custom workout'
        // COALESCE: return the first value that is not null
        let query = `
            SELECT w.id, w.date, COALESCE(r.name, 'Custom Workout') AS name
            FROM workouts w
            LEFT JOIN routines r ON w.routine_id = r.id
            WHERE w.user_id = ? AND date(w.date) = ?
            ORDER BY w.date DESC
        `; // the date from frontend only has YY:MM:DD, using date() to transform date in database of Y:M:D H:M:S to ymd to match
        
        let params = [targetUserId, date];

        const stmt = db.prepare(query);
        const workouts = stmt.all(...params);

        res.json({ workouts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});


// get a specific workout by id
// when clicking on a specific workout, send request /workouts/${id}
/*
return workout structure
{
    workout: {
        "user_id": ...,
        'date': ...,
        'duration_min': ...,
        'note': ...,
        'name': ...,
        'exercises': [
            {
                'exercise_type_id': 1,
                'sets': [
                    { reps: ..., weight: ..., weight_unit: .., rest_sec: ...}
                    { reps: ..., weight: ..., weight_unit: .., rest_sec: ...}
                ]
            },
            more exercises ...
        ]
    }
} */
router.get('/:id', (req, res) => {
    const workoutId = parseInt(req.params.id);

    try {
        const workout = db.prepare(`
            SELECT w.user_id, w.date, w.duration_min, w.note,
                COALESCE(r.name, 'Custom Workout') AS name,
                COALESCE(r.id, NULL) AS routine_id,
                json_group_array(
                    json_object(
                        'exercise_type_id', el.exercise_type_id,
                        'exercise_name', et.name,
                        'sets',
                        (SELECT
                            json_group_array(
                                json_object(
                                    'reps', es.reps,
                                    'weight', es.weight,
                                    'weight_unit', es.weight_unit,
                                    'rest_sec', es.rest_sec
                                )
                            )
                            FROM exercise_sets es
                            WHERE es.exercise_log_id = el.id
                            ORDER BY es.set_order
                        )
                    )
                ) AS exercises
            FROM workouts w
            LEFT JOIN routines r ON w.routine_id = r.id
            LEFT JOIN exercise_logs el ON el.workout_id = w.id
            LEFT JOIN exercise_types et ON el.exercise_type_id = et.id
            WHERE w.id = ?
            GROUP BY w.id
        `).get(workoutId);

        if (!workout) {
            return res.status(404).json({ error: { field: 'general', message: 'Workout not found' } });
        }

        // parse exercises if it's a string (SQLite returns JSON as string)
        workout.exercises = JSON.parse(workout.exercises);

        // double check authorization?
        if (!isAuthorized(req, workout.user_id)) {
            return res.status(403).json({ error: { field: 'general', message: 'Unauthorized access' } });
        }

        res.json({ workout });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// update workout
router.put('/:id', async (req, res) => {
    const workoutId = parseInt(req.params.id);
    const { date, duration_min, note, exercises } = req.body;
    const { error } = workoutSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ errors: handleJoiError(error) });
    try {
        const workout = db.prepare(`SELECT user_id, routine_id FROM workouts WHERE id = ?
        `).get(workoutId);
        if (!workout || req.user.id !== workout.user_id) {
            return res.status(404).json({ error: { field: 'general', message: 'Workout not found or unauthorized' } });
        }
        db.transaction(() => {
            updateWorkout(workoutId, req.user.id, date, duration_min, note, exercises, workout.routine_id);
        })();

        logEvent(req.user.id, 'workout_updated', `Workout ${workoutId} updated by user ${req.user.username}`, req.ip);
        res.json({ message: 'Workout updated successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// unlink a workout with routine
router.post('/:id/detach-routine', (req, res) => {
    const workoutId = parseInt(req.params.id);
    try {
        const workout = db.prepare(`SELECT user_id FROM workouts WHERE id = ?`).get(workoutId);
        if (!workout || req.user.id !== workout.user_id) {
            return res.status(404).json({ error: { field: 'general', message: 'Workout not found or unauthorized' } });
        }

        db.prepare(`UPDATE workouts SET routine_id = NULL WHERE id = ?`).run(workoutId);
        res.json({ message: 'Detached from routine' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

router.delete('/:id', (req, res) => {
    const workoutId = parseInt(req.params.id);

    try {
        const workout = db.prepare(`SELECT user_id, routine_id FROM workouts WHERE id = ?`).get(workoutId);
        if (!workout) {
            return res.status(404).json({ error: { field: 'general', message: 'Workout not found' } });
        }
        if (req.user.id !== workout.user_id) {
            return res.status(403).json({ error: { field: 'general', message: 'Unauthorized to delete this workout' } });
        }

        db.transaction(() => {
            // delete workout (cascade to logs and sets)
            db.prepare(`DELETE FROM workouts WHERE id = ?`).run(workoutId);
        })();

        logEvent(req.user.id, 'workout_deleted', `Workout ${workoutId} deleted by user ${req.user.username}`, req.ip);
        res.json({ message: 'Workout deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// view all comments on a workout (from all instructors)
router.get('/:id/comments', (req, res) => {
    const workoutId = parseInt(req.params.id);

    try {
        const workout = db.prepare(`SELECT id FROM workouts WHERE id = ? AND user_id = ?
        `).get(workoutId, req.user.id);
        if (!workout) return res.status(404).json({ error: { field: 'general', message: 'Workout not found or unauthorized' } });

        const comments = db.prepare(`
            SELECT wc.id, wc.comment_text, wc.created_at, u.username AS instructor_name
            FROM workout_comments wc
            JOIN users u ON u.id = wc.instructor_id
            WHERE wc.workout_id = ?
            ORDER BY wc.created_at DESC
        `).all(workoutId);

        logEvent(req.user.id, 'comment_viewed_all', `All comments viewed for workout ${workoutId}`, req.ip);
        res.json({ comments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});


module.exports = router;
