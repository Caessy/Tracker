const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../db/fitness.db');
const db = Database(dbPath);

module.exports = db;