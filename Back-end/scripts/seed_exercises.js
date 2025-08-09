const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../db/fitness.db'));

const exercises = [
  ['Bench Press', 'Chest', 'Barbell flat bench press'],
  ['Incline Dumbbell Press', 'Chest', 'Incline bench, dumbbells'],
  ['Deadlift', 'Back', 'Conventional barbell deadlift'],
  ['Barbell Squat', 'Legs', 'Back squat with barbell'],
  ['Pull Up', 'Back', 'Bodyweight pull-up'],
  ['Bicep Curl', 'Arms', 'Standing dumbbell biceps curl'],
  ['Tricep Pushdown', 'Arms', 'Cable machine pushdown'],
  ['Shoulder Press', 'Shoulders', 'Seated dumbbell shoulder press'],
  ['Lat Pulldown', 'Back', 'Cable lat pulldown'],
  ['Leg Press', 'Legs', 'Machine leg press']
];

const insert = db.prepare(`
  INSERT INTO exercise_types (name, muscle_group, note) 
  VALUES (?, ?, ?)
`);

for (const [name, muscle, note] of exercises) {
  try {
    insert.run(name, muscle, note);
    console.log(`Inserted: ${name}`);
  } catch (e) {
    console.error(`Failed to insert ${name}:`, e.message);
  }
}

db.close();
