require('dotenv').config({ path: '../.env' });
const express = require('express');
const db = require('../db/connection');
const authenticateToken = require('../middleware/authmid');
const { logEvent } = require('../utils/audit_logs.js');
const joi = require('joi');

const router = express.Router();
router.use(authenticateToken);

// joi schemas
const createBodyStatsSchema = joi.object({
    date: joi.date().iso().required().messages({
        'date.base': 'Date must be a valid ISO date',
        'any.required': 'Date is required'
    }),
    weight_kg: joi.number().positive().optional().messages({
        'number.base': 'Weight must be number',
        'number.positive': 'Weight must be positive'
    }),
    waist_cm: joi.number().positive().optional().messages({
        'number.base': 'Waist must be number',
        'number.positive': 'Waist must be positive'
    }),
    hips_cm: joi.number().positive().optional().messages({
        'number.base': 'Hips must be a number',
        'number.positive': 'Hips must be positive'
    }),
    breast_cm: joi.number().positive().optional().messages({
        'number.base': 'Breast must be a number',
        'number.positive': 'Breast must be positive'
    }),
    body_fat_percentage: joi.number().min(0).max(100).optional().messages({
        'number.base': 'Body fat must be a number',
        'number.min': 'Body fat must be at least 0',
        'number.max': 'Body fat must be at most 100'
    })
});

const dateParamsSchema = joi.object({
    year: joi.number().integer().min(2000).max(2100).required().messages({
        'number.base': 'Year must be a number',
        'number.min': 'Year must be at least 2000',
        'number.max': 'Year must be at most 2100',
        'any.required': 'Year is required'
    }),
    month: joi.number().integer().min(1).max(12).messages({
        'number.base': 'Month must be a number',
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

// create body stats
router.post('/', (req, res) => {
    const { date, weight_kg, waist_cm, hips_cm, breast_cm, body_fat_percentage } = req.body;
    const { error } = createBodyStatsSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ error: handleJoiError(error) });

    try {
        db.prepare(`
            INSERT INTO body_stats (
                user_id,
                date,
                weight_kg,
                waist_cm,
                hips_cm,
                breast_cm,
                body_fat_percentage
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            req.user.id,
            date,
            weight_kg || null,
            waist_cm || null,
            hips_cm || null,
            breast_cm || null,
            body_fat_percentage || null
        );

        logEvent(req.user.id, 'body_stats_created', `Body stats created for date ${date}`, req.ip);
        res.status(201).json({ message: 'Body stats created successfully' });
    } catch (err) {
        console.error(err);
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: { field: 'date', message: 'Body stats for this date already' } });
        }
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// get daily stats in a month
router.get('/monthly', (req, res) => {
    const { year, month } = req.query;
    const { error } = dateParamsSchema.validate({ year, month });
    if (error || !month) return res.status(400).json({ errors: handleJoiError(error) });

    try {
        const data = db.prepare(`
            SELECT date, weight_kg, waist_cm, hips_cm, breast_cm, body_fat_percentage
            FROM body_stats
            WHERE user_id = ? AND strftime('%Y', date) = ? AND strftime('%m', date) = ?
            ORDER BY date ASC
        `).all(req.user.id, year.toString(), month.toString().padStart(2, '0'));
        res.json({ days: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// get monthly average in a year
router.get('/yearly', (req, res) => {
    const { year } = req.query;
    const { error } = dateParamsSchema.validate({ year });
    if (error) return res.status(400).json({ errors: handleJoiError(error) });

    try {
        const data = db.prepare(`
            SELECT strftime('%m', date) AS month,
                AVG(weight_kg) AS avg_weight_kg,
                AVG(waist_cm) AS avg_waist_cm,
                AVG(hips_cm) AS avg_hips_cm,
                AVG(breast_cm) AS avg_breast_cm,
                AVG(body_fat_percentage) AS avg_body_fat_percentage
            FROM body_stats
            WHERE user_id = ? AND strftime('%Y', date) = ?
            GROUP BY month
            ORDER BY month ASC
        `).all(req.user.id, year.toString());

        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const averages = months.map(m => {
            const entry = data.find(d => d.month === m);
            return entry ? {
                month: m,
                avg_weight_kg: entry.avg_weight_kg || null,
                avg_waist_cm: entry.avg_waist_cm || null,
                avg_hips_cm: entry.avg_hips_cm || null,
                avg_breast_cm: entry.avg_breast_cm || null,
                avg_body_fat_percentage: entry.avg_body_fat_percentage || null
            } : {
                month: m,
                avg_weight_kg: null,
                avg_waist_cm: null,
                avg_hips_cm: null,
                avg_breast_cm: null,
                avg_body_fat_percentage: null
            };
        });
        res.json({ averages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

module.exports = router;