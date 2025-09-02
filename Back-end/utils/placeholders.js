const db = require('../db/connection');

function getLatestWorkoutForRoutine(userId, routineId) {
    return db.prepare(`
        SELECT id, date FROM workouts
        WHERE user_id = ? AND routine_id = ?
        ORDER BY datetime(date) DESC
        LIMIT 1
    `).get(userId, routineId);
}

function getExercisePlaceholdersFromWorkout(workoutId) {
    const rows = db.prepare(`
        SELECT el.exercise_type_id, es.set_order, es.reps, es.weight, es.weight_unit, es.rest_sec
        FROM exercise_logs el
        JOIN exercise_sets es ON es.exercise_log_id = el.id
        WHERE el.workout_id = ?
        ORDER BY el.exercise_type_id, es.set_order
    `).all(workoutId);

    const map = new Map();
    for (const r of rows) {
        const key = r.exercise_type_id;
        const cur = map.get(key) || { set_count: 0, max: null };
        cur.set_count += 1;
        const volume = (r.reps || 0) * (r.weight || 0);
        if (!cur.max || volume > cur.max.volume) {
            cur.max = {
                reps: r.reps,
                weight: r.weight,
                weight_unit: r.weight_unit || 'kg',
                rest_sec: r.rest_sec ?? null,
                volume,
            };
        }
        map.set(key, cur);
    }

    const out ={};
    for (const [exercise_type_id, v] of map.entries()) {
        out[exercise_type_id] = {
            set_count: v.set_count,
            reps: v.max?.reps ?? null,
            weight: v.max?.weight ?? null,
            weight_unit: v.max?.weight_unit ?? 'kg',
            rest_sec: v.max?.rest_sec ?? null,
        };
    }
    return out;
}

module.exports = { getLatestWorkoutForRoutine, getExercisePlaceholdersFromWorkout };