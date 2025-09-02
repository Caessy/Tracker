const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'fitness.db');
const db = new Database(dbPath);

const script = `
    CREATE VIEW IF NOT EXISTS calendar_workouts AS
    SELECT
        w.id AS workout_id,
        w.user_id,
        date(w.date) AS workout_date,
        COALESCE(r.name, 'Custom Workout') AS workout_name,
        (SELECT SUM(es.reps * es.weight)
        FROM exercise_logs el
        JOIN exercise_sets es ON es.exercise_log_id = el.id
        WHERE el.workout_id = w.id
        ) AS total_volume
    FROM workouts w
    LEFT JOIN routines r ON w.routine_id = r.id;


    CREATE VIEW IF NOT EXISTS monthly_progress AS
    SELECT
        w.user_id,
        date(w.date) AS workout_date,
        SUM(es.reps * es.weight) AS daily_volume
    FROM workouts w
    JOIN exercise_logs el ON el.workout_id = w.id
    JOIN exercise_sets es ON es.exercise_log_id = el.id
    GROUP BY w.user_id, workout_date;


    CREATE VIEW IF NOT EXISTS yearly_progress AS
    SELECT
        w.user_id,
        strftime('%Y-%m', w.date) AS year_month,
        SUM(es.reps * es.weight) AS month_volume
    FROM workouts w
    JOIN exercise_logs el ON el.workout_id = w.id
    JOIN exercise_sets es ON es.exercise_log_id = el.id
    GROUP BY w.user_id, year_month;

    CREATE VIEW IF NOT EXISTS instructor_trainees AS
    SELECT
        l.id AS link_id,
        l.instructor_id,
        l.user_id AS trainee_id,
        u.username AS trainee_username,
        l.created_at,
        l.expires_at
    FROM user_instructor_links l
    JOIN users u ON u.id = l.user_id
    WHERE l.expires_at > CURRENT_TIMESTAMP;

    CREATE VIEW IF NOT EXISTS user_instructors AS
    SELECT
        l.id AS link_id,
        l.user_id,
        l.instructor_id,
        u.username AS instructor_username,
        l.created_at,
        l.expires_at
    FROM user_instructor_links l
    JOIN users u ON u.id = l.instructor_id
    WHERE l.expires_at > CURRENT_TIMESTAMP;
`;
db.exec(script);
console.log('views created successfully!');