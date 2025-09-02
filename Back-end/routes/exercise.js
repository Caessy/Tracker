require('dotenv').config({ path: '../.env' });
const express = require('express');
const db = require('../db/connection');
const authenticateToken = require('../middleware/authmid');
const { logEvent } = require('../utils/audit_logs.js');
const joi = require('joi');

const router = express.Router();

router.use(authenticateToken);

// joi schema
const createExerciseSchema = joi.object({
    name: joi.string().min(1).max(50).required().messages({
        'string.min': 'Name must be at least 1 characters',
        'string.max': 'Name must be at most 50 characters',
        'any.required': 'Name is required'
    }),
    muscle_group: joi.string().required().messages({
        'any.required': 'muscle group is required'
    }),
    instruction: joi.string().allow('').optional(),
    note: joi.string().allow('').optional()
});

const updateInstructionSchema = joi.object({
    instruction: joi.string().allow('').required().messages({
        'any.required': 'Instruction is required'
    })
});

const updateNoteSchema = joi.object({
    note: joi.string().allow('').required().messages({
        'any.required': 'Note is required'
    })
});

const historyPaginationSchema = joi.object({
    page: joi.number().integer().min(1).default(1),
    limit: joi.number().integer().min(1).default(10)
});

// helper for joi error handling
const handleJoiError = (error) => {
    return error.details.map((detail) => ({
        field: detail.context.key,
        message: detail.message,
    }));
};

// GET all exercises
router.get('/', (req, res) => {
    const { muscle_group, search } = req.query;
    try {
        const exercises = db.prepare(`
            SELECT et.id, et.name, et.muscle_group, et.instruction, et.user_id, COALESCE(uen.note, NULL) AS note
            FROM exercise_types et
            LEFT JOIN user_exercise_notes uen ON uen.exercise_type_id = et.id AND uen.user_id = ?
            WHERE (et.user_id IS NULL OR et.user_id = ?)
            AND (? IS NULL OR et.muscle_group = ?)
            AND (? IS NULL OR et.name LIKE ?)
            ORDER BY et.name
        `).all(
            req.user.id, req.user.id,
            muscle_group || null, muscle_group || null,
            search ? `%${search}%`: null, search ? `%${search}`: null // condition ? value_if_true : value_if_false
        );
        res.json(exercises);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// get single exercise with training history
router.get('/:id', (req, res) => {
    const exerciseId = parseInt(req.params.id);
    const { page = 1, limit = 10 } = req.query; // set default to 1 page and 10 items
    const { error } = historyPaginationSchema.validate({ page, limit });
    if (error) return res.status(400).json({ errors: handleJoiError(error) });

    // exclude ones before that page
    const offset = (page - 1) * limit;

    try {
        const exercise = db.prepare(`
        SELECT
            et.id,
            et.name,
            et.muscle_group,
            et.instruction,
            et.user_id,
            COALESCE(uen.note, null) AS note
        FROM exercise_types et
        LEFT JOIN user_exercise_notes uen ON uen.exercise_type_id = et.id
            AND uen.user_id = ?
        WHERE et.id = ? AND (et.user_id IS NULL OR et.user_id = ?)
        `).get(req.user.id, exerciseId, req.user.id);
        
        if (!exercise) {
            return res.status(404).json({ error: { field: 'general', message: 'Exercise not found or unauthorized' } });
        }

        // find the number of workouts doing this exercise
        const totalWorkouts = db.prepare(`
            SELECT COUNT(DISTINCT w.id) AS total
            FROM workouts w
            JOIN exercise_logs el ON el.workout_id = w.id
            WHERE w.user_id = ? AND el.exercise_type_id = ?
        `).get(req.user.id, exerciseId).total;

        // pagination of exercise history
        exercise.history = db.prepare(`
            SELECT w.id AS workout_id, w.date,
                    r.name AS routine_name,
                    json_group_array(
                        json_object(
                            'set_order', es.set_order,
                            'reps', es.reps,
                            'weight', es.weight,
                            'weight_unit', es.weight_unit,
                            'rest_sec', es.rest_sec
                        )
                    ) AS sets,
                    SUM(es.reps * es.weight) AS volume
            FROM workouts w
            JOIN exercise_logs el ON el.workout_id = w.id
            JOIN exercise_sets es ON es.exercise_log_id = el.id
            LEFT JOIN routines r ON r.id = w.routine_id
            WHERE w.user_id = ? AND el.exercise_type_id = ?
            GROUP BY w.id
            ORDER BY w.date DESC
            LIMIT ? OFFSET ?
        `).all(req.user.id, exerciseId, limit, offset);

        res.json({
            ...exercise, // expand exercise
            history: {
                data: exercise.history,
                meta: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalWorkouts,
                    totalPages: Math.ceil(totalWorkouts / limit)
                }
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// update instruction for custom exercise
router.put('/:id/instruction', (req, res) => {
    const exerciseId = parseInt(req.params.id);
    const { instruction } = req.body;
    const { error } = updateInstructionSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({ errors: handleJoiError(error) });
    }

    try {
        const exercise = db.prepare(`SELECT user_id FROM exercise_types WHERE id = ?`).get(exerciseId);
        if (!exercise || exercise.user_id !== req.user.id) {
            return res.status(403).json({ error: { field: 'general', message: 'Unauthorized act or only instructions of custom exercises can be updated' } });
        }

        db.prepare(`UPDATE exercise_types SET instruction = ? WHERE id = ?`).run(instruction, exerciseId);

        logEvent(req.user.id, 'exercise_instruction_updated', `Instruction updated for exercise ${exerciseId}`, req.ip);
        res.json({ message: 'Instruction updated successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// update note
router.put('/:id/note', (req, res) => {
    const exerciseId = parseInt(req.params.id);
    const { note } = req.body;
    const { error } = updateNoteSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({ errors: handleJoiError(error) });
    }

    try {
        // check if exercise exists and accessible
        const exercise = db.prepare(`SELECT id FROM exercise_types WHERE id = ? AND (user_id IS NULL OR user_id = ?)`)
        .get(exerciseId, req.user.id);
        if (!exercise) {
            return res.status(404).json({ error: { field: 'general', message: 'Exercise not found or unauthorized' } });
        }

        db.transaction(() => {
            const existingNote = db.prepare(`SELECT id FROM user_exercise_notes WHERE user_id = ? AND exercise_type_id = ?`)
            .get(req.user.id, exerciseId);
            if (existingNote) {
                db.prepare(`UPDATE user_exercise_notes SET note = ? WHERE id = ?`).run(note, existingNote.id);
            } else {
                db.prepare(`INSERT INTO user_exercise_notes (user_id, exercise_type_id, note) VALUES (?, ?, ?)`)
                .run(req.user.id, exerciseId, note);
            }
        })();

        logEvent(req.user.id, 'exercise_note_updated', `Note updated for exercise ${exerciseId}`, req.ip);
        res.json({ message: 'Note updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// delete exercises (only custom ones)
// if exercises in routines, cannot be deleted unless routines got deleted first (frontend reminder)
// if exercises in workouts, frontend prompts that deleting this exercise will update all the workouts containing this exercise
router.delete('/:id', (req, res) => {
    const exerciseId = parseInt(req.params.id);

    try {
        const exercise = db.prepare(`SELECT user_id FROM exercise_types WHERE id = ?`)
        .get(exerciseId);
        if (!exercise || exercise.user_id !== req.user.id) {
            return res.status(403).json({ error: { field: 'general', message: 'Only custom exercises can be deleted or unauthorized' } });
        }

        // check if in routine
        const inRoutine = db.prepare(`SELECT 1 FROM routine_exercises WHERE exercise_type_id = ? LIMIT 1`).get(exerciseId);
        if (inRoutine) {
            return res.status(409).json({ error: { field: 'general', message: 'Exercise is used in routine(s). Remove routines first' } });
        }

        db.transaction(() => {
            // remove exercise from workouts if in use (delete logs and sets on cascade)
            db.prepare(`DELETE FROM exercise_logs WHERE exercise_type_id= ?`).run(exerciseId);

            // delete the exercise (note deleted on cascade)
            db.prepare(`DELETE FROM exercise_types WHERE id = ?`).run(exerciseId);
        })();

        logEvent(req.user.id, 'exercise_deleted', `Exercise ${exerciseId} deleted by user ${req.user.username}`, req.ip);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// create custom exercise
router.post('/', (req, res) => {
    const { name, muscle_group, instruction, note } = req.body;
    const { error } = createExerciseSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ errors: handleJoiError(error) });

    try {
        let exerciseId;
        db.transaction(() => {
            // check unique exercise name per user (UNIQUE(user_id, name))
            const existing = db.prepare(`SELECT id FROM exercise_types WHERE user_id = ? AND name = ?`)
            .get(req.user.id, name);
            if (existing) throw new Error('Exercise name already exists');

            const insertExercise = db.prepare(`INSERT INTO exercise_types (name, muscle_group, instruction, user_id) VALUES (?, ?, ?, ?)`);
            const result = insertExercise.run(
                name,
                muscle_group,
                instruction,
                req.user.id
            );
            exerciseId = result.lastInsertRowid;

            if (note) {
                db.prepare(`INSERT INTO user_exercise_notes (user_id, exercise_type_id, note) VALUES (?, ?, ?)`)
                .run(req.user.id, exerciseId, note);
            }
        })();

        logEvent(req.user.id, 'exercise_created', `Custom exercise ${name} created by user ${req.user.username}`, req.ip);
        res.status(201).json({ message: 'Custom exercise created successfully', id: exerciseId });
    } catch (err) {
        console.error(err);
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: { field: 'general', message: 'exercise in use' } });
        }
        res.status(500).json({ error: { field: 'general', message: err.message || 'Server error' } });
    }
});

module.exports = router;