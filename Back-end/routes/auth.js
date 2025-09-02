require('dotenv').config({ path: '../.env' });
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { logEvent } = require('../utils/audit_logs.js');
const db = require('../db/connection.js');
const authenticateToken = require('../middleware/authmid.js');
const joi = require('joi');
const nodemailer = require('nodemailer');

const router = express.Router();
const saltRounds = 12; // the number of times the password being hashed
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set');
}

// generate jwt token
function generateToken (user) {
    return jwt.sign({
        id: user.id,
        username: user.username,
        is_instructor: user.is_instructor
    }, jwtSecret, { expiresIn: '1h' });
}

// email sending function
async function sendResetEmail(to, resetToken) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject: 'Password Reset for Workout Tracker',
        html: `<p>Your password reset code is: <strong>${resetToken}</strong></p>
        <p>Enter this code to reset your password. It expires in 15 minutes.</p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Reset email sent successfully');
    } catch (err) {
        console.error('Email error:', err);
        throw err;
    }
}
// helpers for error handling
const handleJoiError = (error) => {
    return error.details.map((detail) => ({
        field: detail.context.key,
        message: detail.message
    }));
};

const handleServerError = (res, err, message = 'Server error') => {
    console.error(err);
    return res.status(500).json({ error: { field: 'general', message } });
};

// joi schemas
// Joi schemas
const loginSchema = joi.object({
    username: joi.string().required().min(3).max(50).messages({
        'string.empty': 'Username is required',
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username must be at most 50 characters'
    }),
    password: joi.string().required().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain at least one uppercase, lowercase, number, and special character'
    }),
    otp: joi.string().length(6).optional().messages({
        'string.length': 'OTP must be exactly 6 characters'
    })
});

const registerSchema = joi.object({
    username: joi.string().min(3).max(30).required().messages({
        'string.base': 'Username must be a string',
        'string.empty': 'Username is required',
        'any.required': 'Username is required',
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username must be at most 30 characters'
    }),
    password: joi.string().min(8).max(128).required().pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,128}$')).messages({
        'string.base': 'Password must be string',
        'string.empty': 'Password is required',
        'any.required': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.max': 'Password must be at most 128 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    }),
    email: joi.string().email({ tlds: { allow: false } }).required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Invalid email format'
    })
});

const forgotPasswordSchema = joi.object({
    username: joi.string().required().min(3).max(50).messages({
        'string.empty': 'Username is required',
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username must be at most 50 characters'
    }),
    email: joi.string().email({ tlds: { allow: false } }).required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Invalid email format'
    })
});

const verifyTokenSchema = joi.object({
    userId: joi.number().integer().required().messages({
        'number.base': 'User ID must be a number',
        'any.required': 'User ID is required'
    }),
    resetToken: joi.string().required().length(6).pattern(/^\d{6}$/).messages({
        'string.empty': 'Reset token is required',
        'string.length': 'Reset token must be exactly 6 digits',
        'string.pattern.base': 'Reset token must be a 6-digit number'
    })
});

const resendTokenSchema = joi.object({
    userId: joi.number().integer().required().messages({
        'number.base': 'User ID must be a number',
        'any.required': 'User ID is required'
    })
});

const resetPasswordSchema = joi.object({
    userId: joi.number().integer().required().messages({
        'number.base': 'User ID must be a number',
        'any.required': 'User ID is required'
    }),
    newPassword: joi.string().required().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).messages({
        'string.empty': 'New password is required',
        'string.min': 'New password must be at least 8 characters',
        'string.pattern.base': 'New password must contain at least one uppercase, lowercase, number, and special character'
    })
});


// POST /auth/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // validate the request body
    const { error } = registerSchema.validate(req.body, { abortEarly: false }); // abortEarly: false ensures all errors are collected, not just the first
    if (error) {
        return res.status(400).json({ errors: handleJoiError(error) });
    }

    // if validation passes, proceed with hashing and DB insert
    try {
        const hashPassword = await bcrypt.hash(password, saltRounds);

        const stmt = db.prepare(`
            INSERT INTO users (username, email, password)
            VALUES(?, ?, ?)
        `)
        const result = stmt.run(username, email, hashPassword);

        // logging this register to audit_logs
        logEvent(result.lastInsertRowid, 'user_register', `User ${username} registered`, req.ip);
        
        res.status(201).json({ message: 'User Registered Successfully!' });

    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ errors: [{ field: 'username', message: 'username or email already exists'}] });
        }
        return handleServerError(res, err);
    }
});


// auth/login with or without MFA
/* implementation plan:
    1. receive request body
    2. verify joi
    3. search user (prevent sql injection)
    4. verify password (bcrypt.compare)
    5.
        -if mfa enabled, generate tempToken and send res to frontend
        - if mfa not enabled, proceed to 6-8
    6. new last_login
    7. generate final jwt token
    8. log login history
    9. res
*/
router.post('/login', async (req, res) => {
    const { username, password, otp } = req.body;

    const { error } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({ errors: handleJoiError(error) });
    }
    

    try {
        // try to find the user in the database
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            logEvent(null, 'login_failed', `Attempt with non-existent username: ${username}`, req.ip);
            return res.status(401).json({ error: { field: 'general', message: 'Invalid credentials' } });
        }

        // verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logEvent(user.id, 'login_failed', 'Invalid password', req.ip);
            return res.status(401).json({ error: { field: 'password', message: 'Invalid credentials' } });
        }

        // mfa verification if enabled
        if (user.mfa_enabled) {
            const tempToken = jwt.sign({
                id: user.id,
                username: user.username,
                temp: true },
                jwtSecret,
                { expiresIn: '15m' }
            );

            logEvent(user.id, 'mfa_required', `MFA required for user ${username}`, req.ip);
            return res.json({
                mfaRequired: true,
                tempToken,
                message: 'MFA required',
                user: {
                    id: user.id,
                    username: user.username,
                    is_instructor: user.is_instructor,
                    mfa_enabled: user.mfa_enabled
                }
            });
        }

        // update last_login
        db.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`).run(user.id);

        // generate final jwt token
        const token = generateToken(user);

        // log success
        logEvent(user.id, 'login_success', `User ${username} logged in`, req.ip);

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                is_instructor: user.is_instructor,
                mfa_enabled: user.mfa_enabled
            },
            message: 'Login successful'
        });

    } catch (err) {
        return handleServerError(res, err);
    }
});

// forget password
/*
FLOW:
    1. user submits username/email
    2. backend verifies the combo
    3. generate reset token + OTP (is enabled)
    4. send email with reset code
*/
router.post('/forgot-password', async (req, res) => {
    const { username , email } = req.body;
    
    const { error } = forgotPasswordSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({ errors: handleJoiError(error) });
    }

    try {
        const user = db.prepare(`SELECT * FROM users WHERE username = ? AND email = ?`).get(username, email);
        if (!user) {
            logEvent(null, 'forgot_password_failed', `Invalid username/email: ${username}/${email}`, req.ip);
            return res.status(404).json({ error: { field: 'general', message: 'User not found' } });
        }

        // generate reset token 6digits from 100000 to 999999
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15*60*1000).toISOString(); // 15 minutes expiry

        // store reset token, expiry in db
        db.prepare(`UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?`).run(resetToken, expiry, user.id);

        // send email with code
        await sendResetEmail(email, resetToken);

        logEvent(user.id, 'forgot_password_requested', `Password reset requested for ${username}`, req.ip);
        res.json({ message: 'Reset code sent to email', userId: user.id });
    } catch (err) {
        return handleServerError(res, err);
    }
});

// verify reset password email token
router.post('/verify-token', async (req, res) => {
    const { userId, resetToken } = req.body;

    const { error } = verifyTokenSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({ errors: handleJoiError(error) });
    }

    try {
        const user = db.prepare(`SELECT * FROM users WHERE reset_token = ? AND reset_expires > CURRENT_TIMESTAMP AND id = ?`)
        .get(resetToken, userId);
        if (!user) {
            logEvent(null, 'verify_token_failed', `Invalid or expired reset token: ${resetToken}`, req.ip);
            return res.status(401).json({ error: { field: 'resetToken', message: 'Invalid or expired reset code' } });
        }
        db.prepare(`UPDATE users SET reset_token = NULL, reset_expires = NULL WHERE id = ?`).run(userId);
        logEvent(userId, 'verify_token_success', `Reset token verified for user ${user.username}`, req.ip);
        res.json({ message: 'Token verified, proceed to reset password', userId: user.id });
    } catch (err) {
        return handleServerError(res, err);
    }
});

// resend token
// since this resend will only happen after previous username + email combo verification, no need to check legit form again
// front end should remember and send the userId received from /forgot-password back
router.post('/resend-token', async (req, res) => {
    const { userId } = req.body;

    const { error } = resendTokenSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({ errors: handleJoiError(error) });
    }

    try {
        const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
        if (!user) {
            logEvent(null, 'resend_token_failed', `Invalid userId: ${userId}`, req.ip);
            return res.status(404).json({ error: { field: 'userId', message: 'User not found' } });
        }

        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        db.prepare(`UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?`)
        .run(resetToken, expiry, userId);

        await sendResetEmail(user.email, resetToken);
        logEvent(userId, 'resend_token_requested', `Resent reset token for ${user.username}`, req.ip);
        res.json({ message: 'New reset code sent to email' })
    } catch (err) {
        return handleServerError(res, err);
    }
});

// reset password
router.post('/reset-password', async (req, res) => {
    const { userId, newPassword } = req.body;

    const { error } = resetPasswordSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({ errors: handleJoiError(error) });
    }

    try {
        const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
        if (!user) {
            logEvent(null, 'password_reset_failed', `Invalid userId: ${userId}`, req.ip);
            return res.status(404).json({ error: { field: 'userId', message: 'User not found' } });
        }

        const hashPassword = await bcrypt.hash(newPassword, saltRounds);
        db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(hashPassword, userId);

        logEvent(userId, 'password_reset', `Password reset for user ${user.username}`, req.ip);
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        return handleServerError(res, err);
    }
});

// for simplicity, do not require anything other than login status
// make sure to warn the user at frontend that deletion of account is irreversible
// TODO remember to return to login page after deletion complete at the front end
router.delete('/delete-account', authenticateToken, async (req, res) => {
    try {
        const user = db.prepare(`SELECT password, username FROM users WHERE id = ?`).get(req.user.id);
        if (!user) {
            logEvent(null, 'delete_account_failed', `Invalid userId: ${req.user.id}`, req.ip);
            return res.status(401).json({ error: { field: 'password', message: 'Invalid password' } });
        }

        db.prepare(`DELETE FROM users WHERE id = ?`).run(req.user.id);
        logEvent(req.user.id, 'account_deleted', `User ${user.username} deleted account`, req.ip);
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        return handleServerError(res, err);
    }
});

// get current logged in user info
router.get('/me', authenticateToken, (req, res) => {
    const user = db.prepare('SELECT id, username, is_instructor, mfa_enabled FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
});

module.exports = router;