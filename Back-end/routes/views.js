const express = require('express');
const db = require('../db/connection');
const authenticateToken = require('../middleware/authmid');
const { logEvent } = require('../utils/audit_logs.js');
const router = express.Router();

router.use(authenticateToken);

// allowing instructor to access training history graphs
function isAuthorized(req, targetUserId) {
    if (req.user.id === targetUserId) return true;
    if (req.user.is_instructor !== 1) return false;
    const link = db.prepare(`
        SELECT * from user_instructor_links
        WHERE user_id = ? AND instructor_id = ? AND expires_at > CURRENT_TIMESTAMP
    `).get(targetUserId, req.user.id);

    return !!link;
}

// construct calendar for a whole month page
router.get('/calendar/month', (req, res) => {
    const targetUserId = parseInt(req.query.user_id) || req.user.id;
    const { year, month } = req.query; // month 格式: 01-12

    if (!year || !month) {
        return res.status(400).json({ error: 'year and month are required' });
    }

    if (!isAuthorized(req, targetUserId)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const firstDay = `${year}-${month}-01`;
        const lastDay = `${year}-${month}-31`;

        const workouts = db.prepare(`
            SELECT w.id, date(w.date) AS day, COALESCE(r.name,'Custom Workout') AS name,
                   SUM(es.reps * es.weight) AS volume
            FROM workouts w
            LEFT JOIN routines r ON w.routine_id = r.id
            LEFT JOIN exercise_logs el ON el.workout_id = w.id
            LEFT JOIN exercise_sets es ON es.exercise_log_id = el.id
            WHERE w.user_id = ? AND date(w.date) BETWEEN ? AND ?
            GROUP BY w.id
            ORDER BY w.date ASC
        `).all(targetUserId, firstDay, lastDay);

        // 转换成 day => [workouts] 格式
        const calendar = {};
        workouts.forEach(w => {
            if (!calendar[w.day]) calendar[w.day] = [];
            calendar[w.day].push({
                id: w.id,
                name: w.name,
                volume: w.volume || 0
            });
        });

        res.json({ calendar });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// get workouts on calendar for a specific date
router.get('/calendar', (req, res) => {
    const userId = parseInt(req.query.user_id) || req.user.id;
    const date = req.query.date; // 格式: YYYY-MM-DD

    if (!isAuthorized(req, userId)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const workouts = db.prepare(`
            SELECT * FROM calendar_workouts
            WHERE user_id = ? AND workout_date = ?
            ORDER BY workout_date ASC
        `).all(userId, date);

        res.json({ workouts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// get progress curve for a specific month
router.get('/progress/monthly', (req, res) => {
    const userId = parseInt(req.query.user_id) || req.user.id;
    const month = req.query.month;

    if (!isAuthorized(req, userId)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const data = db.prepare(`
            SELECT * FROM monthly_progress
            WHERE user_id = ? AND strftime('%Y-%m', workout_date) = ?
            ORDER BY workout_date ASC
        `).all(userId, month);

        res.json({ data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// get progress curve for a specific year
router.get('/progress/yearly', (req, res) => {
    const userId = parseInt(req.query.user_id) || req.user.id;
    const year = req.query.year; // YYYY

    if (!isAuthorized(req, userId)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const data = db.prepare(`
            SELECT
                strftime('%Y-%m', w.date) AS year_month,
                COALESCE(SUM(es.reps * es.weight), 0) AS month_volume
            FROM workouts w
            LEFT JOIN exercise_logs el ON el.workout_id = w.id
            LEFT JOIN exercise_sets es ON es.exercise_log_id = el.id
            WHERE w.user_id = ? AND strftime('%Y', w.date) = ?
            GROUP BY year_month
            ORDER BY year_month ASC;
        `).all(userId, year);
        res.json({ data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// get all trainees
router.get('/instructor/trainees', (req, res) => {
    if (req.user.is_instructor !== 1) {
        return res.status(403).json({ error: 'You are not an instructor' });
    }

    try {
        const trainees = db.prepare(`
            SELECT * FROM instructor_trainees
            WHERE instructor_id = ?
        `).all(req.user.id);
        console.log(`Trainees for user ${req.user.id}:`, trainees);
        res.json({ trainees });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// get all instructors
router.get('/user/instructors', (req, res) => {
    try {
        const instructors = db.prepare(`
            SELECT * FROM user_instructors
            WHERE user_id = ?
        `).all(req.user.id);

        res.json({ instructors });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
