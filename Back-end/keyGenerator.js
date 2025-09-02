const crypto = require('crypto');

const mfaKey = crypto.randomBytes(32).toString('hex');
console.log('MFA_encryption_key=', mfaKey);

const jwtKey = crypto.randomBytes(32).toString('base64');
console.log('JWT_secret=', jwtKey);