/*
this router includes routes to
1. enabling MFA
2. verify mfa and log user in
3. if device lost, disable mfa to recover
4. disable mfa when logged in
*/
require('dotenv').config({ path: '../.env' });
const express = require('express');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto-js');
const db = require('../db/connection');
const authenticateToken = require('../middleware/authmid');
const { logEvent } = require('../utils/audit_logs.js');
const jwt = require('jsonwebtoken');

const router = express.Router();
const encryptionKey = process.env.MFA_ENCRYPTION_KEY;
if (!encryptionKey) {
    throw new Error('MFA_ENCRYPTION_KEY is not set');
}

const jwtSecretKey = process.env.JWT_SECRET;

// 1. enabling mfa and generate QR code
router.post('/enable', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // 如果已经启用了 MFA，不允许重复生成
        const existing = db.prepare(`SELECT mfa_enabled FROM users WHERE id = ?`).get(userId);
        if (existing.mfa_enabled) {
            return res.status(400).json({ error: { field: 'general', message: 'MFA already enabled' } });
        }

        // 生成 secret
        const secret = speakeasy.generateSecret({
            name: `WorkoutTracker:${req.user.username}`,
            length: 32,
        });

        // 加密存储
        const encryptedSecret = crypto.AES.encrypt(secret.base32, encryptionKey).toString();

        // 恢复码
        const recoveryCode = require('crypto').randomBytes(5).toString('hex');

        // 存 secret 和 recoveryCode，但此时 mfa_enabled 还是 0
        db.prepare(`UPDATE users SET mfa_secret = ?, recovery_code = ? WHERE id = ?`)
          .run(encryptedSecret, recoveryCode, userId);

        // 生成二维码
        const qrCode = await qrcode.toDataURL(secret.otpauth_url);

        res.json({
            qrCode,
            recoveryCode,
            message: 'Scan the QR code and then enter OTP to complete enabling MFA'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

router.post('/enable/verify', authenticateToken, (req, res) => {
    try {

        const userId = req.user.id;
        const { otp } = req.body;
        console.log('Verify body:', req.body);
        const user = db.prepare(`SELECT mfa_secret FROM users WHERE id = ?`).get(userId);
        console.log('User MFA:', user);
        if (!user || !user.mfa_secret) {
            return res.status(400).json({ error: { field: 'general', message: 'No MFA setup pending' } });
        }

        const decryptedSecret = crypto.AES.decrypt(user.mfa_secret, encryptionKey).toString(crypto.enc.Utf8);
        console.log('Decrypted Secret:', decryptedSecret);
console.log('OTP from user:', req.body.otp);
        const isValid = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token: otp,
            window: 1
        });
console.log('Verified:', isValid);
        if (!isValid) {
            return res.status(400).json({ error: { field: 'general', message: 'Invalid OTP' } });
        }

        // OTP 验证通过，正式开启 MFA
        db.prepare(`UPDATE users SET mfa_enabled = 1 WHERE id = ?`).run(userId);

        res.json({ message: 'MFA enabled successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});


// verify OTP during login
router.post('/verify', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ error: { field: 'general', message: 'OTP required' } });
        }

        // fetch user data
        const user = db.prepare(`SELECT id, mfa_secret, mfa_enabled, username, is_instructor FROM users WHERE id = ?`).get(userId);
        if (!user || !user.mfa_enabled) {
            return res.status(400).json({ error: { field: 'general', message: 'MFA not enabled' } });
        }

        const decryptedSecret = crypto.AES.decrypt(user.mfa_secret, encryptionKey).toString(crypto.enc.Utf8);
        console.log("Decrypted Secret:", decryptedSecret);
        console.log("OTP:", otp);
        console.log("TOTP Now:", speakeasy.totp({ secret: decryptedSecret, encoding: 'base32' }));
console.log("TOTP Prev:", speakeasy.totp({ secret: decryptedSecret, encoding: 'base32', time: Math.floor((Date.now()/1000 - 30)/30) }));
console.log("TOTP Next:", speakeasy.totp({ secret: decryptedSecret, encoding: 'base32', time: Math.floor((Date.now()/1000 + 30)/30) }));


        const isValid = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token: otp,
            window: 1
        });
        console.log(isValid);

        if (isValid) {
            db.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`).run(userId); // update last login

            const token = jwt.sign({ id: user.id, username: user.username, is_instructor: user.is_instructor }, jwtSecretKey, { expiresIn: '1h' }); // generate final token

            logEvent(userId, 'mfa_verified', `MFA verified and logged in for user ${user.username}`, req.ip);
            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    is_instructor: user.is_instructor,
                    mfa_enabled: true
                },
                message: 'Login successful'
            });
        } else {
            res.status(400).json({ error: { field: 'general', message: 'Invalid OTP A' } });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// recover and disable mfa using recovery code
// after recovery and disabling, front end should go back the first login interface for username and password input
router.post('/recover', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const { recoveryCode } = req.body;

        if (!recoveryCode) {
            return res.status(400).json({ error: { field: 'general', message: 'Recovery code required' } });
        }

        const user = db.prepare(`SELECT recovery_code, mfa_enabled FROM users WHERE id = ?`).get(userId);
        if (!user || !user.mfa_enabled) {
            return res.status(400).json({ error: { field: 'general', message: 'MFA not enabled or recovery not needed' } });
        }

        if (recoveryCode === user.recovery_code) {
            db.prepare(`UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, recovery_code = NULL WHERE id = ?`)
            .run(userId);
            logEvent(userId, 'mfa_disabled_recover', `MFA disabled via recovery code for user ${req.user.username}`, req.ip);
            res.json({ message: 'MFA disabled successfully. Please re-enable MFA if needed' });
        } else {
            res.status(400).json({ error: { field: 'general', message: 'Invalid recovery code' } });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

// disable mfa
router.post('/disable', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;

        db.prepare(`UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?`).run(userId);

        logEvent(userId, 'mfa_disabled', `MFA disabled for user ${req.user.username}`, req.ip);

        res.json({ message: 'MFA disabled successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { field: 'general', message: 'Server error' } });
    }
});

module.exports = router;