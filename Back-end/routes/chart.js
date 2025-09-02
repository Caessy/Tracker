require('dotenv').config({ path: '../.env' });
const express = require('express');
const db = require('../db/connection');
const authenticateToken = require('../middleware/authmid');
const { logEvent } = require('../utils/audit_logs.js');
const joi = require('joi');

const router = express.Router();
router.use(authenticateToken);

// joi schema for date params
const dateParamsSchema = joi.object({
    year: joi.number().integer().min(2000).max(2100).required().messages({
        'number.base': 'Year must be a number',
        'number.min': 'Year must be at least 2000',
        'number.max': 'Year must be at most 2100',
        'any.required': 'Year is required'
    }),
    month: joi.number().integer().min(1).max(12).messages({
        'number.base': 'Month must be number',
        'number.min': 'Month must be between 1 and 12',
        'number.max': 'Month must be between 1 and 12'
    })
});

// helper for joi error handling
const handleJoiError = (error) => {
    return error.details.map((detail) => ({
        field: detail.context.key,
        message: detail.message,
    }));
};

// allowing instructor to access training history graphs
function isAuthorized(req, targetUserId) {
    if (req.user.id === targetUserId) return true;
    if (req.user.is_instructor !== 1) return false;
    const link = db.prepare(`
        SELECT * from user_instructor_link
        WHERE user_id = ? AND instructor = ? AND expires_at > CURRENT_TIMESTAMP
    `).get(targetUserId, req.user.id);

    return !!link;
}


// get daily volume changes in a month
router.get('/monthly-volume', (req, res) => {
    const { year, month, user_id } = req.query;
    const { error } = dateParamsSchema.validate({ year, month });
    if (error || !month) {
        return res.status(400).json({ errors: handleJoiError(error) });
    }

    const targetUserId = parseInt(user_id) || req.user.id;
    if (!isAuthorized(req, targetUserId)) {
        return res.status(403).json({ error: { field: 'general', message: 'Unauthorized access' } });
    }

    try {
        const data = db.prepare(`
            SELECT strftime('%Y-%m-%d', w.date) AS date,
                SUM(es.reps *
                    CASE
                        WHEN es.weight_unit = 'lb' THEN es.weight * 0.45
                        ELSE es.weight
                    END) AS volume
            FROM workout w
            JOIN exercise_logs el ON el.workout_id = w.id
            JOIN exercise_sets es ON es.exercise_log_id = el.id
            WHERE w.user_id = ? AND strftime('%Y', w.date) = ? AND strftime('%m', w.date) = ?
            GROUP BY date
            ORDER BY date ASC
        `).all(targetUserId, year.toString(), month.toString().padStart(2, '0'));

        // mapping dates and volumes into two fields
        res.json({
            dates: data.map(d => d.date),
            volumes: data.map(d => d.volume || 0)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// get monthly volume changes in a year
router.get('/yearly-volume', (req, res) => {
    const { year, user_id } = req.query;
    const { error } = dateParamsSchema.validate({ year });
    if (error) return res.status(400).json({ errors: handleJoiError(error) });

    const targetUserId = parseInt(user_id) || req.user.id;
    if (!isAuthorized(req, targetUserId)) {
        return res.status(403).json({ error: { field: 'general', message: 'unauthorized access' } });
    }

    try {
        const data = db.prepare(`
            SELECT strftime('%m', w.date) AS month,
                SUM(es.reps *
                    CASE
                        WHEN es.weight_unit = 'lb' THEN es.weight * 0.45
                        ELSE es.weight
                    END) AS volume
            FROM workouts w
            JOIN exercise_logs el ON el.workout_id = w.id
            JOIN exercise_sets es ON es.exercise_log_id = el.id
            WHERE w.user_id = ? AND strftime('%Y', w.date) = ?
            GROUP BY month
            ORDER BY month ASC
        `).all(targetUserId, year.toString());

        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const volumes = months.map(m => data.find(d => d.month === m)?.volume || 0);

        res.json({ months, volumes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// get calendar date for a month
router.get('/calendar', (req, res) => {
    const { year, month, user_id } = req.query;
    const { error } = dateParamsSchema.validate({ year, month });
    if (error || !month) return res.status(400).json({ errors: handleJoiError(error) });

    const targetUserId = parseInt(user_id) || req.user.id;
    if (!isAuthorized(req, targetUserId)) {
        return res.status(403).json({ error: { field: 'general', message: 'unauthorized access' } });
    }

    try {
        const days = db.prepare(`
            SELECT strftime('%Y-%m-%d', w.date) AS date,
                SUM(es.reps *
                    CASE
                        WHEN es.weight_unit = 'lb' THEN es.weight * 0.45
                        ELSE es.weight
                    END) AS volume,
                GROUP_CONCAT(DISTINCT r.name) AS routine_name
            FROM workouts w
            JOIN exercise_logs el ON el.workout_id = w.id
            JOIN exercise_sets es ON es.exercise_log_id = el.id
            LEFT JOIN routines r ON r.id = w.routine_id
            WHERE w.user_id = ? AND strftime('%Y', w.date) = ? AND strftime('%m', w.date) = ?
            GROUP BY date
            ORDER BY date ASC
        `).all(targetUserId, year.toString(), month.toString().padStart(2, '0'));

        res.json({ days });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

module.exports = router;
