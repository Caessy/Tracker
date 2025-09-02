require('dotenv').config({ path: '../.env' });
const express = require('express');
const db = require('../db/connection');
const authenticateToken = require('../middleware/authmid');
const { logEvent } = require('../utils/audit_logs.js');
const joi = require('joi');
const { getLatestWorkoutForRoutine, getExercisePlaceholdersFromWorkout } = require('../utils/placeholders.js');

const router = express.Router();

router.use(authenticateToken);

// joi schemas
const createRoutineSchema = joi.object({
  name: joi.string().min(1).max(30).required().messages({
    'string.min': 'Name must be at lease 1 character',
    'string.max': 'Name must be at most 30 characters',
    'any.required': 'Name is required'
  }),
  description: joi.string().allow('').optional(),
  exercises: joi.array().items(
    joi.object({
      exercise_type_id: joi.number().integer().required().messages({
        'number.base': 'Exercise type ID must be a number',
        'any.required': 'Exercise type ID is required'
      }),
    })
  ).min(1).required().messages({
    'array.min': 'At least one exercise is required',
    'any.required': 'Exercises are required'
  })
});

//helper for joi error handling
const handleJoiError = (error) => {
  return error.details.map((detail) => ({
    field: detail.context.key,
    message: detail.message,
  }));
};

// helper: query routine with exercises
function getRoutineWithExercisesAndPlaceholders(routineId, userId) {
  const routine = db.prepare(`SELECT * FROM routines WHERE id = ?`).get(routineId);
  if (!routine) return null;

  const rows = db.prepare(`
    SELECT re.exercise_type_id, re.exercise_order, et.name AS exercise_name
    FROM routine_exercises re
    JOIN exercise_types et ON et.id = re.exercise_type_id
    WHERE re.routine_id = ?
    ORDER BY re.exercise_order
  `).all(routineId);

  const latest = getLatestWorkoutForRoutine(userId, routineId);
  console.log(latest);
  const placeholders = latest ? getExercisePlaceholdersFromWorkout(latest.id) : {};
  console.log(placeholders);
  
  routine.exercises = rows.map((row) => ({
    id: row.exercise_type_id,
    name: row.exercise_name,
    order: row.exercise_order,
    placeholder: placeholders[row.exercise_type_id] || null
  }));

  routine.last_workout = latest ? {id: latest.id, date: latest.date } : null;
  routine.type = routine.user_id ? 'custom' : 'system';

  return routine;
}


// list all routines for user
router.get('/', (req, res) => {
  try {
    const routines = db.prepare(`
      SELECT id, name, description, created_at,
        CASE WHEN user_id IS NULL THEN 'system' ELSE 'custom' END AS type
        FROM routines WHERE user_id = ? OR user_id IS NULL
    `).all(req.user.id);
    res.json(routines);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: { field: 'general', message: 'Server error' } });
  }
});

// get a routine with its details by ID
router.get('/:id', (req, res) => {
  const routineId = parseInt(req.params.id);
  try {
    const routine = getRoutineWithExercisesAndPlaceholders(routineId, req.user.id);
    if (!routine) {
      return res.status(404).json({ error: { field: 'general', message: 'Routine not found'} });
    }

    if (routine.user_id && routine.user_id !== req.user.id) {
      return res.status(401).json({ error: { field: 'general', message: 'Unauthorized' }});
    }
    res.json(routine);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { field: 'general', message: 'Server error' } });
  }
});

// create routine
router.post('/', (req, res) => {
  const { name, description, exercises } = req.body;
  const { error } = createRoutineSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: handleJoiError(error) });

  try {
    db.transaction(() => {
      // check unique routine name per user
      const existing = db.prepare(`SELECT id FROM routines WHERE user_id = ? AND name = ?`).get(req.user.id, name);
      if (existing) {
        throw new Error('Routine name already exists');
      }

      const insertRoutine = db.prepare(`INSERT INTO routines (user_id, name, description) VALUES (?, ?, ?)`);
      const result = insertRoutine.run(req.user.id, name, description || null);
      const routineId = result.lastInsertRowid;

      exercises.forEach((ex, index) => {
        db.prepare(`INSERT INTO routine_exercises (
            routine_id,
            exercise_type_id,
            exercise_order
          ) VALUES (?, ?, ?)`
        ).run(
          routineId,
          ex.exercise_type_id,
          index + 1,
        );
      });
    })();

    logEvent(req.user.id, 'routine_created', `Routine ${name} created by user ${req.user.username}`, req.ip);
    res.status(201).json({ message: 'Routine created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { field: 'general', message: 'Server error' } });
  }
});

// delete routine
router.delete('/:id', (req, res) => {
  const routineId = parseInt(req.params.id);

  try {
    const routine = db.prepare(`SELECT user_id FROM routines WHERE id = ?`).get(routineId);
    if (!routine || routine.user_id != req.user.id) {
      return res.status(404).json({ error: { field: 'general', message: 'Routine not found or unauthorized' } });
    }

    db.transaction(() => {
      db.prepare(`UPDATE workouts SET routine_id = NULL WHERE routine_id = ?`).run(routineId);
      // delete routine (cascades to routine_exercises)
      db.prepare(`DELETE FROM routines WHERE id = ?`).run(routineId);
    })();

    logEvent(req.user.id, 'routine_deleted', `Routine ${routineId} deleted by user ${req.user.username}`, req.ip);
    res.json({ message: 'Routine deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { field: 'general', message: 'Server error' } });
  }
});

module.exports = router;
