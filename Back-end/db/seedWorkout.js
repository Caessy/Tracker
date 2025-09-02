const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'fitness.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const userId = 1;

// 时间跨度：2024-01-01 到 今天
const startDate = new Date('2024-01-01T00:00:00');
const endDate = new Date(); // 今天

const exerciseTypeIds = Array.from({ length: 50 }, (_, i) => i + 1);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateDates(start, end) {
  const dates = [];
  let d = new Date(start);
  while (d <= end) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

const dates = generateDates(startDate, endDate);

const insertWorkout = db.prepare(`
  INSERT INTO workouts (user_id, date, duration_min, note)
  VALUES (?, ?, ?, ?)
`);
const insertExerciseLog = db.prepare(`
  INSERT INTO exercise_logs (workout_id, exercise_type_id)
  VALUES (?, ?)
`);
const insertExerciseSet = db.prepare(`
  INSERT INTO exercise_sets (exercise_log_id, set_order, reps, weight, weight_unit, rest_sec)
  VALUES (?, ?, ?, ?, ?, ?)
`);

db.transaction(() => {
  for (const date of dates) {
    const workoutsPerDay = randomInt(1, 2);
    for (let w = 0; w < workoutsPerDay; w++) {
      const duration = randomInt(30, 90);
      const note = Math.random() < 0.3 ? 'Auto generated workout' : null;
      const workoutResult = insertWorkout.run(userId, date.toISOString(), duration, note);
      const workoutId = workoutResult.lastInsertRowid;

      const exercisesInWorkout = [];
      while (exercisesInWorkout.length < randomInt(3, 4)) {
        const exId = exerciseTypeIds[randomInt(0, exerciseTypeIds.length - 1)];
        if (!exercisesInWorkout.includes(exId)) exercisesInWorkout.push(exId);
      }

      for (const exId of exercisesInWorkout) {
        const logResult = insertExerciseLog.run(workoutId, exId);
        const logId = logResult.lastInsertRowid;

        const setsCount = randomInt(2, 3);
        for (let s = 1; s <= setsCount; s++) {
          const reps = randomInt(6, 15);
          const weight = randomFloat(20, 80);
          const rest = randomInt(30, 120);
          insertExerciseSet.run(logId, s, reps, weight, 'kg', rest);
        }
      }
    }
  }
})();

console.log('Workout data injection completed!');
