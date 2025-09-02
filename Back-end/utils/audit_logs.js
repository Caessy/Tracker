const db = require('../db/connection');

function logEvent(userId, eventType, details, ipAddress) {
    const stmt = db.prepare(`
        INSERT INTO audit_logs (user_id, event_type, details, ip_address)
        VALUES (?, ?, ?, ?)
    `);

    stmt.run(userId || null, eventType, details, ipAddress || 'Unknown');
}

module.exports = { logEvent };