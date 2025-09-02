const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'fitness.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomDateString(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

try {
  // 获取所有 exercise_types 的 id
  const exerciseTypes = db.prepare('SELECT id FROM exercise_types').all().map(row => row.id);

  // 获取所有 routines 的 id（假设有5个默认的）
  const routines = db.prepare('SELECT id FROM routines').all().map(row => row.id);

  if (exerciseTypes.length === 0 || routines.length === 0) {
    throw new Error('No exercise types or routines found in the database.');
  }

  // 从 2024-01-01 到 2025-08-26
  const startDate = new Date(2024, 0, 1); // January 1, 2024
  const endDate = new Date(2025, 7, 26); // August 26, 2025
  const userId = 2;

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const numWorkouts = getRandomInt(1, 2); // 每天1到2条workout

    for (let i = 0; i < numWorkouts; i++) {
      const isRoutine = Math.random() < 0.5; // 50% 概率是Routine，否则Custom
      let routineId = null;
      let selectedExercises = [];

      if (isRoutine) {
        // 随机选一个routine
        routineId = routines[getRandomInt(0, routines.length - 1)];
        // 获取该routine的exercises，按order排序
        selectedExercises = db.prepare(`
          SELECT exercise_type_id, exercise_order
          FROM routine_exercises
          WHERE routine_id = ?
          ORDER BY exercise_order ASC
        `).all(routineId).map(row => ({ id: row.exercise_type_id, order: row.exercise_order }));
      } else {
        // Custom: 随机选3-8个exercises
        const numExercises = getRandomInt(3, 8);
        const shuffled = [...exerciseTypes].sort(() => 0.5 - Math.random());
        selectedExercises = shuffled.slice(0, numExercises).map((id, index) => ({ id, order: index + 1 }));
      }

      // 插入workout
      const workoutDate = generateRandomDateString(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const durationMin = getRandomInt(30, 120);
      const note = Math.random() < 0.3 ? 'Random note for this workout' : null; // 30%概率有note

      const insertWorkout = db.prepare(`
        INSERT INTO workouts (user_id, date, duration_min, note, routine_id)
        VALUES (?, ?, ?, ?, ?)
      `);
      const workoutResult = insertWorkout.run(userId, workoutDate, durationMin, note, routineId);
      const workoutId = workoutResult.lastInsertRowid;

      // 对于每个exercise，插入exercise_log和sets
      for (const ex of selectedExercises) {
        const insertLog = db.prepare(`
          INSERT INTO exercise_logs (workout_id, exercise_type_id)
          VALUES (?, ?)
        `);
        const logResult = insertLog.run(workoutId, ex.id);
        const logId = logResult.lastInsertRowid;

        const numSets = getRandomInt(2, 4); // 每动作2-4组
        for (let setOrder = 1; setOrder <= numSets; setOrder++) {
          const reps = getRandomInt(5, 20);
          const weight = getRandomInt(10, 200);
          const restSec = getRandomInt(60, 180);
          const weightUnit = 'kg'; // 默认kg

          const insertSet = db.prepare(`
            INSERT INTO exercise_sets (exercise_log_id, set_order, reps, weight, weight_unit, rest_sec, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          insertSet.run(logId, setOrder, reps, weight, weightUnit, restSec, workoutDate);
        }
      }
    }
  }

  console.log('Workout records injected successfully for user ID 1 from 2024-01-01 to 2025-08-26.');

} catch (error) {
  console.error('Failed to inject workout records: ', error.message);
  throw error;
} finally {
  db.close();
}