const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'fitness.db');
let db;

try {
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  db.transaction(() => {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      is_active BOOLEAN DEFAULT 1,
      is_instructor BOOLEAN DEFAULT 0,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      mfa_secret TEXT,
      mfa_enabled BOOLEAN DEFAULT 0,
      recovery_code TEXT,
      reset_token TEXT,
      reset_expires DATETIME
    );

    CREATE TABLE IF NOT EXISTS body_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      weight_kg REAL CHECK (weight_kg > 0),
      waist_cm REAL CHECK (waist_cm > 0),
      hips_cm REAL CHECK (hips_cm > 0),
      breast_cm REAL CHECK (breast_cm > 0),
      body_fat_percentage REAL CHECK (body_fat_percentage BETWEEN 0 AND 100),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE (user_id, date)
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      duration_min INTEGER CHECK (duration_min > 0),
      note TEXT,
      routine_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (routine_id) REFERENCES routines (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercise_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_group TEXT,
      instruction TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, name)
    );

    CREATE TABLE IF NOT EXISTS user_exercise_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      exercise_type_id INTEGER NOT NULL,
      note TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_type_id) REFERENCES exercise_types (id) ON DELETE CASCADE,
      UNIQUE (user_id, exercise_type_id)
    );

    CREATE TABLE IF NOT EXISTS routines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE (user_id, name)
    );

    CREATE TABLE IF NOT EXISTS routine_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL,
      exercise_type_id INTEGER NOT NULL,
      exercise_order INTEGER NOT NULL CHECK (exercise_order > 0),
      FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_type_id) REFERENCES exercise_types(id) ON DELETE RESTRICT,
      UNIQUE (routine_id, exercise_order)
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
      weight_unit TEXT CHECK (weight_unit in ('kg', 'lb')) DEFAULT 'kg',
      rest_sec INTEGER CHECK (rest_sec > 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exercise_log_id) REFERENCES exercise_logs(id) ON DELETE CASCADE,
      UNIQUE (exercise_log_id, set_order)
    );

    CREATE TABLE IF NOT EXISTS user_instructor_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      instructor_id INTEGER,
      token TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME DEFAULT (datetime('now', '+30 days')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, instructor_id)
    );

    CREATE TABLE IF NOT EXISTS workout_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      instructor_id INTEGER NOT NULL,
      comment_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      event_type TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      details TEXT,
      expires_at DATETIME DEFAULT (datetime('now', '+30 days')),
      ip_address TEXT
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      language TEXT DEFAULT 'en' CHECK (language IN ('en', 'zh')),
      unit_system TEXT DEFAULT 'metric' CHECK (unit_system IN ('metric', 'imperial')),
      date_format TEXT DEFAULT 'DD/MM/YYYY',
      color_schema TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_users_username ON users (username);
    CREATE INDEX idx_exercise_logs_workout_id ON exercise_logs (workout_id);
    CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
    CREATE INDEX idx_body_stats_user_date ON body_stats(user_id, date);
    CREATE INDEX idx_routines_user ON routines(user_id);
    CREATE INDEX idx_routine_exercises_routine ON routine_exercises(routine_id);
    CREATE INDEX idx_user_instructor_links_token ON user_instructor_links(token);
    `);
    
    // AI generated 50 exercises with instructions to be prefilled as system default exercises
    const exerciseTypes = [
      { name: 'Push-Up', muscle_group: 'Chest', instruction: 'Start in a plank position with hands shoulder-width apart, lower your body until chest nearly touches the ground, then push back up while keeping core engaged for full chest activation.' },
      { name: 'Incline Bench Press', muscle_group: 'Chest', instruction: 'Lie on an incline bench with barbell at chest level, press the weight upwards explosively, then lower slowly to target upper chest muscles effectively for better definition.' },
      { name: 'Chest Fly', muscle_group: 'Chest', instruction: 'Lie on a bench holding dumbbells above chest, lower arms out to sides in a wide arc, then bring them back up, squeezing chest at the top for isolation.' },
      { name: 'Dips', muscle_group: 'Chest', instruction: 'Using parallel bars, lower body by bending elbows until shoulders are below elbows, then push up, leaning forward to emphasize chest over triceps for compound movement.' },
      { name: 'Cable Crossover', muscle_group: 'Chest', instruction: 'Stand between cable machines, pull handles across body in a hugging motion, squeeze chest at midpoint, then return slowly to stretch pectorals fully.' },
      { name: 'Decline Push-Up', muscle_group: 'Chest', instruction: 'Place feet on elevated surface, hands on ground, lower chest to floor, push up while maintaining straight body line to target lower chest area.' },
      { name: 'Pec Deck Machine', muscle_group: 'Chest', instruction: 'Sit on machine with arms on pads, bring arms together in front, squeeze chest, then open slowly to feel the stretch in pectoral muscles.' },
      { name: 'Pull-Up', muscle_group: 'Back', instruction: 'Hang from a bar with palms facing away, pull body up until chin passes bar, lower slowly to engage lats and upper back for strength building.' },
      { name: 'Bent-Over Row', muscle_group: 'Back', instruction: 'Bend at hips holding barbell, pull weight to lower chest, squeeze shoulder blades, lower controlled to target mid-back and rhomboids effectively.' },
      { name: 'Deadlift', muscle_group: 'Back', instruction: 'Stand with feet hip-width, grip barbell, lift by extending hips and knees, keep back straight, lower by hinging at hips for posterior chain work.' },
      { name: 'Lat Pulldown', muscle_group: 'Back', instruction: 'Sit at machine, pull bar down to chest while leaning back slightly, squeeze lats, then release slowly to full arm extension.' },
      { name: 'Seated Row', muscle_group: 'Back', instruction: 'Sit with feet braced, pull handles to torso, squeeze shoulder blades, extend arms forward to stretch back muscles without rounding spine.' },
      { name: 'Face Pull', muscle_group: 'Back', instruction: 'Using cable machine at eye level, pull rope to face, elbows high, squeeze rear delts and upper back for posture improvement.' },
      { name: 'T-Bar Row', muscle_group: 'Back', instruction: 'Straddle T-bar, bend knees, pull bar to chest, contract back muscles, lower slowly to build thickness in mid-back area.' },
      { name: 'Overhead Press', muscle_group: 'Shoulders', instruction: 'Stand with barbell at shoulder height, press overhead until arms lock, lower to collarbone level while keeping core tight for deltoid strength.' },
      { name: 'Lateral Raise', muscle_group: 'Shoulders', instruction: 'Hold dumbbells at sides, raise arms out to shoulder height, lower slowly, focus on side delts without swinging for isolation.' },
      { name: 'Front Raise', muscle_group: 'Shoulders', instruction: 'Hold dumbbells in front, raise arms to shoulder height, lower controlled, engage anterior delts while keeping elbows slightly bent.' },
      { name: 'Upright Row', muscle_group: 'Shoulders', instruction: 'Grip barbell narrow, pull to chin level with elbows leading, lower slowly to target traps and side delts effectively.' },
      { name: 'Rear Delt Fly', muscle_group: 'Shoulders', instruction: 'Bend forward holding dumbbells, raise arms out to sides, squeeze rear delts at top, lower with control for posterior shoulder balance.' },
      { name: 'Arnold Press', muscle_group: 'Shoulders', instruction: 'Sit with dumbbells at shoulder, palms facing in, press while rotating palms out, lower reversing motion to hit all deltoid heads.' },
      { name: 'Shrugs', muscle_group: 'Shoulders', instruction: 'Hold dumbbells at sides, elevate shoulders towards ears, hold squeeze, lower slowly to build trapezius muscles for upper back support.' },
      { name: 'Bicep Curl', muscle_group: 'Arms', instruction: 'Stand with dumbbells at sides, curl weights to shoulders, squeeze biceps, lower slowly without swinging for peak contraction.' },
      { name: 'Hammer Curl', muscle_group: 'Arms', instruction: 'Hold dumbbells neutral grip, curl to shoulders, focus on brachialis, lower controlled to enhance forearm and bicep thickness.' },
      { name: 'Tricep Extension', muscle_group: 'Arms', instruction: 'Hold dumbbell overhead, lower behind head bending elbows, extend arms up, squeeze triceps at top for arm definition.' },
      { name: 'Skull Crusher', muscle_group: 'Arms', instruction: 'Lie on bench with barbell above forehead, lower to skull level, extend elbows, focus on triceps without flaring elbows.' },
      { name: 'Preacher Curl', muscle_group: 'Arms', instruction: 'Sit at preacher bench, curl barbell from full extension, squeeze at top, lower slowly to isolate biceps peak.' },
      { name: 'Tricep Kickback', muscle_group: 'Arms', instruction: 'Bend forward, extend arm back with dumbbell, squeeze tricep at full extension, lower controlled for rear arm toning.' },
      { name: 'Concentration Curl', muscle_group: 'Arms', instruction: 'Sit with elbow on thigh, curl dumbbell to shoulder, focus on bicep squeeze, lower slowly for unilateral isolation.' },
      { name: 'Squat', muscle_group: 'Legs', instruction: 'Stand with feet shoulder-width, lower hips back until thighs parallel to ground, drive up through heels engaging quads and glutes.' },
      { name: 'Lunges', muscle_group: 'Legs', instruction: 'Step forward with one foot, lower until back knee nearly touches ground, push back to start, alternate legs for quad and glute work.' },
      { name: 'Leg Press', muscle_group: 'Legs', instruction: 'Sit in machine, feet on platform, extend legs pushing weight away, lower slowly bending knees to 90 degrees for quad emphasis.' },
      { name: 'Romanian Deadlift', muscle_group: 'Legs', instruction: 'Hold barbell, hinge at hips lowering to shins, keep back straight, extend hips to stand, target hamstrings and lower back.' },
      { name: 'Calf Raise', muscle_group: 'Legs', instruction: 'Stand on toes with heels off edge, raise heels high, lower below platform, squeeze calves for lower leg development.' },
      { name: 'Leg Curl', muscle_group: 'Legs', instruction: 'Lie face down on machine, curl heels to glutes, squeeze hamstrings, lower slowly to full extension for posterior leg isolation.' },
      { name: 'Step-Up', muscle_group: 'Legs', instruction: 'Step onto bench with one foot, drive up bringing other knee high, step down, alternate for quad and glute unilateral strength.' },
      { name: 'Plank', muscle_group: 'Core', instruction: 'Hold forearm plank position, body straight from head to heels, engage core, hold for time while breathing steadily for stability.' },
      { name: 'Russian Twist', muscle_group: 'Core', instruction: 'Sit with knees bent, lean back, twist torso side to side holding weight, engage obliques for rotational strength.' },
      { name: 'Bicycle Crunch', muscle_group: 'Core', instruction: 'Lie on back, alternate bringing elbow to opposite knee in cycling motion, engage abs throughout for oblique and rectus work.' },
      { name: 'Leg Raise', muscle_group: 'Core', instruction: 'Lie on back, raise legs to 90 degrees, lower slowly without touching ground, control with lower abs for hip flexor strength.' },
      { name: 'Mountain Climber', muscle_group: 'Core', instruction: 'In plank position, alternate driving knees to chest quickly, maintain hip level, engage core for cardio and stability.' },
      { name: 'Hanging Knee Raise', muscle_group: 'Core', instruction: 'Hang from bar, raise knees to chest, lower slowly, avoid swinging to target lower abs and grip strength.' },
      { name: 'Woodchopper', muscle_group: 'Core', instruction: 'Stand with cable high, pull diagonally across body to low, twist torso, return slowly for oblique rotational power.' },
      { name: 'Burpee', muscle_group: 'Full Body', instruction: 'From standing, squat to plank, push-up, jump back to squat, explosive jump up, repeat for full body cardio and strength.' },
      { name: 'Kettlebell Swing', muscle_group: 'Full Body', instruction: 'Hinge at hips with kettlebell, swing to shoulder height using hips, squeeze glutes at top, lower controlled for power.' },
      { name: 'Thruster', muscle_group: 'Full Body', instruction: 'Squat with barbell at shoulders, drive up pressing overhead, lower to shoulders then squat, combine for explosive full body.' },
      { name: 'Clean and Jerk', muscle_group: 'Full Body', instruction: 'Lift barbell from ground to shoulders in clean, then jerk overhead, lower controlled, build Olympic lifting power.' },
      { name: 'Battle Rope', muscle_group: 'Full Body', instruction: 'Hold ropes, alternate slamming waves rapidly, engage core and arms, maintain squat stance for cardio endurance.' },
      { name: 'Medicine Ball Slam', muscle_group: 'Full Body', instruction: 'Lift ball overhead, slam to ground explosively, catch rebound, repeat to release stress and build power in core and arms.' },
      { name: 'Jump Rope', muscle_group: 'Full Body', instruction: 'Jump over rope continuously, vary speed and footwork, engage calves and core for cardiovascular and coordination benefits.' }
    ]

    const insertExerciseType = db.prepare('INSERT OR IGNORE INTO exercise_types (name, muscle_group, instruction) VALUES (?, ?, ?)');

    for (const type of exerciseTypes) {
      insertExerciseType.run(type.name, type.muscle_group, type.instruction);
    }

    const defaultRoutines = [
      {
        name: 'Beginner Full Body',
        description: 'Basic full-body routine for beginners, 3x/week.',
        exercises: [
          { exercise_type_id: 1, exercise_order: 1 },
          { exercise_type_id: 29, exercise_order: 2 },
          { exercise_type_id: 9, exercise_order: 3 },
          { exercise_type_id: 15, exercise_order: 4 },
          { exercise_type_id: 36, exercise_order: 5 }
        ]
      },
      {
        name: 'Upper Body Push',
        description: 'Focus on pushing muscles: chest, shoulders, triceps.',
        exercises: [
          { exercise_type_id: 1, exercise_order: 1 },
          { exercise_type_id: 15, exercise_order: 2 },
          { exercise_type_id: 2, exercise_order: 3 },
          { exercise_type_id: 24, exercise_order: 4 },
          { exercise_type_id: 3, exercise_order: 5 }
        ]
      },
      {
        name: 'Lower Body Strength',
        description: 'Build leg strength and stability.',
        exercises: [
          { exercise_type_id: 29, exercise_order: 1 },
          { exercise_type_id: 32, exercise_order: 2 },
          { exercise_type_id: 30, exercise_order: 3 },
          { exercise_type_id: 33, exercise_order: 4 },
          { exercise_type_id: 34, exercise_order: 5 }
        ]
      },
      {
        name: 'Core and Abs',
        description: 'Target core muscles for stability and definition.',
        exercises: [
          { exercise_type_id: 36, exercise_order: 1 },
          { exercise_type_id: 37, exercise_order: 2 },
          { exercise_type_id: 38, exercise_order: 3 },
          { exercise_type_id: 39, exercise_order: 4 },
          { exercise_type_id: 41, exercise_order: 5 }
        ]
      },
      {
        name: 'Advanced Full Body',
        description: 'High-intensity full-body for experienced users.',
        exercises: [
          { exercise_type_id: 12, exercise_order: 1 },
          { exercise_type_id: 43, exercise_order: 2 },
          { exercise_type_id: 46, exercise_order: 3 },
          { exercise_type_id: 44, exercise_order: 4 },
          { exercise_type_id: 48, exercise_order: 5 }
        ]
      }
    ];

    // Insert default routines into db
    const insertRoutine = db.prepare('INSERT OR IGNORE INTO routines (name, description) VALUES (?, ?)');
    const insertRoutineExercise = db.prepare('INSERT INTO routine_exercises (routine_id, exercise_type_id, exercise_order) VALUES (?, ?, ?)');
    for (const routine of defaultRoutines) {
      const result = insertRoutine.run(routine.name, routine.description);
      const routineId = result.lastInsertRowid;
      if (!routineId) {
        const row = db.prepare('SELECT id FROM routines WHERE name = ?').get(routine.name);
        routineId = row.id;
      }
      for (const ex of routine.exercises) {
        insertRoutineExercise.run(routineId, ex.exercise_type_id, ex.exercise_order);
      }
    }

  }) ();
  
  console.log('Database initialized successfully at: ' + dbPath);

} catch (error) {
  console.error('Failed to initialize database: ', error.message);
  throw error;
  
} finally {
  db.close();
}