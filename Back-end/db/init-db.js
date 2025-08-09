const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'fitness.db');

const db = new Database(dbPath);


db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_min INTEGER CHECK (duration_min > 0),
  note TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercise_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  muscle_group TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS exercise_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  exercise_type_id INTEGER NOT NULL,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_type_id) REFERENCES exercise_types(id) ON DELETE RESTRICT,
  UNIQUE (workout_id, exercise_type_id)
);

CREATE TABLE IF NOT EXISTS exercise_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_log_id INTEGER NOT NULL,
  set_order INTEGER NOT NULL CHECK (set_order > 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  weight REAL NOT NULL CHECK (weight >= 0),
  rest_sec INTEGER CHECK (rest_sec > 0),
  FOREIGN KEY (exercise_log_id) REFERENCES exercise_logs(id) ON DELETE CASCADE,
  UNIQUE (exercise_log_id, set_order)
);
`);

console.log('Database initialized successfully at: ' + dbPath);
db.close();
