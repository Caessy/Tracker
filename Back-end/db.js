const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'db', 'fitness.db');

const db = new Database(dbPath);

module.exports = db;